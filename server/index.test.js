const request = require('supertest');
const app = require('./index');
const httpMocks = require('node-mocks-http');

jest.mock('axios');
const axios = require('axios');

const { generateRandomString } = require('./utils/utilityFunctions');
const { authenticateUser, fetchSpotifyUserProfile } = require('./middlewares/authenticateUser');

jest.mock('../database/database', () => ({
    getUserBySpotifyID: jest.fn(),
    createUserAfterSpotifyAuth: jest.fn(),
    addTrack: jest.fn(),
}));
const { getUserBySpotifyID, createUserAfterSpotifyAuth, addTrack } = require('../database/database');


// Tests generateRandomString function
describe('generateRandomString', function () {
    it('generate a string of the correct length', function () {
        const length = 10;
        const str = generateRandomString(length);
        expect(str).toHaveLength(length);
    });

    it('only contain characters from the specified set', function () {
        const length = 100;
        const str = generateRandomString(length);
        const allowedCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let char of str) {
            expect(allowedCharacters).toContain(char);
        }
    });

    it('produce different strings on subsequent calls', function () {
        const str1 = generateRandomString(10);
        const str2 = generateRandomString(10);
        expect(str1).not.toEqual(str2);
    });
});

// Tests fetchSpotifyUserProfile
describe('fetchSpotifyUserProfile', () => {

    it('returns user profile data when the fetch is successful', async function () {
        // Mock successful response
        const mockUserProfile = { id: 'user1', name: 'Test User' };
        axios.get.mockResolvedValue({ data: mockUserProfile });

        const accessToken = 'validToken';
        const profile = await fetchSpotifyUserProfile(accessToken);

        expect(axios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        expect(profile).toEqual(mockUserProfile);
    });

    it('returns null when the fetch fails', async function () {
        // Mock a failed request
        axios.get.mockRejectedValue(new Error('Request failed'));

        const accessToken = 'invalidToken';
        const profile = await fetchSpotifyUserProfile(accessToken);

        expect(profile).toBeNull();
    });
});

// Tests authenticateUser
describe('authenticateUser Middleware', () => {

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks to avoid interference
    });

    it('should return 401 if no access token is provided', async () => {
        const req = httpMocks.createRequest({
            method: 'GET',
            url: '/test',
            cookies: {}
        });
        const res = httpMocks.createResponse();
        const next = jest.fn();

        await authenticateUser(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res._getData()).toBe('Access token required');
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if the access token is invalid', async () => {
        axios.get.mockResolvedValue(null);

        const req = httpMocks.createRequest({
            method: 'GET',
            url: '/test',
            cookies: { accessToken: 'invalid-token' }
        });
        const res = httpMocks.createResponse();
        const next = jest.fn();

        await authenticateUser(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res._getData()).toBe('Invalid access token');
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 if user does not exist in the database', async () => {
        axios.get.mockResolvedValue({
            data: { id: 'user-id' } // Mocked response data for axios
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, null)); // Simulate user not found

        const req = httpMocks.createRequest({
            method: 'GET',
            url: '/test',
            cookies: { accessToken: 'valid-token' }
        });
        const res = httpMocks.createResponse();
        const next = jest.fn();

        await authenticateUser(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getData()).toBe('User not found');
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() for valid token and existing user', async () => {
        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        const req = httpMocks.createRequest({
            method: 'GET',
            url: '/test',
            cookies: { accessToken: 'valid-token' }
        });
        const res = httpMocks.createResponse();
        const next = jest.fn();

        await authenticateUser(req, res, next);

        expect(req.user).toEqual(mockUserRow);
        expect(next).toHaveBeenCalled();
        expect(res.statusCode).not.toBe(401);
        expect(res.statusCode).not.toBe(404);
    });

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks to avoid interference
    });
});

// Tests GET /auth/login route endpoint
describe('GET /auth/login', function () {
    it('redirects to Spotify authorization URL', function (done) {
        request(app)
            .get('/auth/login')
            .expect(302) // Expecting HTTP status code 302 for redirection
            .end(function (err, res) {
                // Verify the Location header contains the correct Spotify auth URL
                const receivedLocation = res.headers.location;
                expect(receivedLocation.startsWith('https://accounts.spotify.com/authorize/?')).toBe(true);
                expect(receivedLocation).toContain('response_type=code');
                expect(receivedLocation).toContain('client_id=');
                expect(receivedLocation).toContain('scope=streaming+user-read-email+user-read-private');
                expect(receivedLocation).toContain('redirect_uri=');
                expect(receivedLocation).toContain('state=');

                done(err);
            });
    });
});

// // Tests GET /auth/callback endpoint
describe('/auth/callback endpoint', () => {
    it('should exchange code for an access token and fetch user profile', async () => {
        const mockAccessToken = 'mock_access_token';
        const mockUserProfile = { id: 'user-id', name: 'Test User' };

        // Mocking axios for token exchange
        axios.mockResolvedValueOnce({
            data: { access_token: 'mock_access_token' }, // Mocked response for token exchange
            status: 200
        });

        // Mocking axios for fetching Spotify profile
        axios.get.mockResolvedValueOnce({
            data: mockUserProfile // Mocked response data for axios profile fetch
        });

        // Mocking database createUserAfterSpotifyAuth function
        createUserAfterSpotifyAuth.mockImplementation((spotifyProfile, callback) => {
            callback(null, { id: spotifyProfile.id });
        });

        const response = await request(app).get('/auth/callback?code=valid_code');

        expect(response.status).toBe(302); // Expect to be redirected
        expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
            expect.stringContaining('accessToken=' + mockAccessToken)
        ]));
    });

    it('should handle failure to exchange token', async () => {
        // Mocking axios to simulate failure in token exchange
        axios.mockRejectedValueOnce(new Error('Failed to obtain access token'));

        const response = await request(app).get('/auth/callback?code=invalid_code');

        expect(response.status).toBe(500);
        expect(response.text).toBe('Authentication error');
    });

    it('should handle failure to create a user in the database', async () => {
        const mockAccessToken = 'mock_access_token';

        // Mock axios to simulate successful token exchange
        axios.mockResolvedValueOnce({
            status: 200,
            data: { access_token: mockAccessToken }
        });

        // Mock axios for profile fetching
        axios.mockResolvedValueOnce({
            status: 200,
            data: { id: 'spotify_user_id' }
        });

        // Mocking database createUserAfterSpotifyAuth function to simulate failure
        createUserAfterSpotifyAuth.mockImplementation((spotifyProfile, callback) => {
            callback(new Error('Failed to create user'), null);
        });

        const response = await request(app).get('/auth/callback?code=valid_code');

        expect(response.status).toBe(500);
        expect(response.text).toBe('Authentication error');
    });

    it('should handle failure to fetch Spotify profile', async () => {
        const mockAccessToken = 'mock_access_token';

        // Mock axios to simulate successful token exchange
        axios.mockResolvedValueOnce({
            status: 200,
            data: { access_token: mockAccessToken }
        });

        // Mock axios for profile fetching to simulate failure
        axios.get.mockRejectedValueOnce(new Error('Failed to fetch Spotify profile'));

        const response = await request(app).get('/auth/callback?code=valid_code');

        expect(response.status).toBe(500);
        expect(response.text).toBe('Authentication error');
    });

    it('should handle non-200 response status from Spotify token endpoint', async () => {
        // Mock axios to simulate non-200 response from token exchange
        axios.mockResolvedValueOnce({
            status: 400,
            data: { error: 'invalid_grant', error_description: 'Invalid authorization code' }
        });

        const response = await request(app).get('/auth/callback?code=expired_code');

        expect(response.status).toBe(500);
        expect(response.text).toBe('Authentication error');
    });

    it('should handle missing authorization code in the request', async () => {
        const response = await request(app).get('/auth/callback'); // No code query parameter

        expect(response.status).toBe(500);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });
});

// Tests POST /auth/callback endpoint
//describe('/track endpoint', () => {
// it('should add a track for an authenticated user', async () => {
//     // Mock `authenticateUser` middleware to simulate a successful authentication
//     jest.mock('./index', () => (req, res, next) => {
//         req.user = { id: 'user-id', name: 'Test User' }; // Simulate attaching user to request
//         next();
//     });

//     // Mock `db.addTrack` to simulate a successful adding of track to database
//     addTrack.mockImplementation((trackData, callback) => {
//         callback(null); // No error
//     });

//     const response = await request(app)
//         .post('/track')
//         .set('Cookie', ['accessToken=valid-token']) // Simulate a valid access token cookie
//         .send({
//             spotifyTrackID: '12345',
//             title: 'Test Track',
//             artist: 'Test Artist',
//             album: 'Test Album'
//         });

//     expect(response.status).toBe(201);
//     expect(response.text).toBe('Track added');
//     expect(addTrack).toHaveBeenCalledWith(expect.objectContaining({
//         spotifyTrackID: '12345',
//         title: 'Test Track',
//         artist: 'Test Artist',
//         album: 'Test Album'
//     }), expect.any(Function));
// });

// it('should add a track for an authenticated user', async () => {
//     // Mock `db.addTrack` to simulate a successful adding of track to database
//     addTrack.mockImplementation((trackData, callback) => {
//         callback(null); // No error
//     });

//     // Assuming `db.addTrack` is correctly mocked elsewhere in your setup
//     const trackPayload = {
//         spotifyTrackID: '12345',
//         title: 'Test Track',
//         artist: 'Test Artist',
//         album: 'Test Album'
//     };

//     const response = await request(app)
//         .post('/track')
//         // Simulate authentication by directly manipulating the request, or by using a test-specific middleware setup
//         .send(trackPayload)
//         .set('Authorization', `Bearer valid-token`); // Example of setting headers, adjust based on actual auth logic

//     expect(response.status).toBe(201);
//     expect(response.text).toBe('Track added');
// });



// it('should respond with an error if adding the track fails', async () => {
//     // Setup
//     addTrack.mockImplementation((trackInfo, callback) => callback(new Error('Database error')));

//     // Execute
//     const response = await request(app).post('/track').send({
//         spotifyTrackID: '12345',
//         title: 'Test Track',
//         artist: 'Test Artist',
//         album: 'Test Album',
//     });

//     // Assert
//     expect(response.status).toBe(500);
//     expect(response.text).toBe('Failed to add track');
// });

// it('should reject unauthenticated requests', async () => {
//     // Modify the authenticateUser mock for this test to simulate authentication failure
//     jest.mock('../path/to/authenticateUser', () => (req, res, next) => {
//         res.sendStatus(401); // Send Unauthorized status
//     });

//     // Execute
//     const response = await request(app).post('/track').send({
//         spotifyTrackID: '67890',
//         title: 'Another Test Track',
//         artist: 'Another Test Artist',
//         album: 'Another Test Album',
//     });

//     // Assert
//     expect(response.status).toBe(401);
// });
//     afterEach(() => {
//         jest.resetAllMocks();
//     });
// });
