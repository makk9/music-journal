const request = require('supertest');
const { app, generateRandomString, fetchSpotifyUserProfile, authenticateUser } = require('./index');
const axios = require('axios');
const { db, getUserBySpotifyID } = require('../database/database');
const httpMocks = require('node-mocks-http');


jest.mock('axios');

jest.mock('../database/database', () => ({
    db: {
        getUserBySpotifyID: jest.fn(),
    },
}));

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
// describe('authenticateUser Middleware', () => {
//     it('should return 401 if no access token is provided', async () => {
//         const req = httpMocks.createRequest({
//             method: 'GET',
//             url: '/test',
//             cookies: {}
//         });
//         const res = httpMocks.createResponse();
//         const next = jest.fn();

//         await authenticateUser(req, res, next);

//         expect(res.statusCode).toBe(401);
//         expect(res._getData()).toBe('Access token required');
//         expect(next).not.toHaveBeenCalled();
//     });

//     it('should return 401 if the access token is invalid', async () => {
//         fetchSpotifyUserProfile.mockResolvedValue(null); // Simulate invalid token

//         const req = httpMocks.createRequest({
//             method: 'GET',
//             url: '/test',
//             cookies: { accessToken: 'invalid-token' }
//         });
//         const res = httpMocks.createResponse();
//         const next = jest.fn();

//         await authenticateUser(req, res, next);

//         expect(res.statusCode).toBe(401);
//         expect(res._getData()).toBe('Invalid access token');
//         expect(next).not.toHaveBeenCalled();
//     });

//     it('should return 404 if user does not exist in the database', async () => {
//         fetchSpotifyUserProfile.mockResolvedValue({ id: 'user-id' }); // Simulate valid token
//         db.getUserBySpotifyID.mockImplementation((id, callback) => callback(null, null)); // Simulate user not found

//         const req = httpMocks.createRequest({
//             method: 'GET',
//             url: '/test',
//             cookies: { accessToken: 'valid-token' }
//         });
//         const res = httpMocks.createResponse();
//         const next = jest.fn();

//         await authenticateUser(req, res, next);

//         expect(res.statusCode).toBe(404);
//         expect(res._getData()).toBe('User not found');
//         expect(next).not.toHaveBeenCalled();
//     });

//     it('should call next() for valid token and existing user', async () => {
//         const mockUserProfile = { id: 'user-id', name: 'Test User' };
//         const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
//         fetchSpotifyUserProfile.mockResolvedValue(mockUserProfile);
//         db.getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

//         const req = httpMocks.createRequest({
//             method: 'GET',
//             url: '/test',
//             cookies: { accessToken: 'valid-token' }
//         });
//         const res = httpMocks.createResponse();
//         const next = jest.fn();

//         await authenticateUser(req, res, next);

//         expect(req.user).toEqual(mockUserRow);
//         expect(next).toHaveBeenCalled();
//         expect(res.statusCode).not.toBe(401);
//         expect(res.statusCode).not.toBe(404);
//     });
// });


// // suite tests successful behavior of GET /auth/token route endpoint
// describe('GET /auth/token', () => {
//     beforeEach(() => {
//         // Mock successful axios HTTP request for this suite
//         axios.post.mockResolvedValue({
//             status: 200,
//             data: { access_token: 'mocked_token' }
//         });
//     });

//     it('returns an access token', async () => {
//         const response = await request(app).get('/auth/token');
//         expect(response.statusCode).toBe(200);
//         expect(response.body).toEqual({ access_token: expect.any(String) });
//     });

//     afterEach(() => {
//         axios.post.mockReset(); // Reset the mock after each test
//     });
// });

// // suite tests unsuccessful behavior of GET /auth/token route endpoint
// describe('GET /auth/callback error handling', () => {
//     beforeEach(() => {
//         // Mock unsuccessful axios HTTP request for this suite
//         axios.post.mockRejectedValue({
//             response: {
//                 status: 400,
//                 data: { error: 'Bad Request' }
//             }
//         });
//     });

//     it('responds with 500 on authentication error', async () => {
//         const response = await request(app).get('/auth/callback?code=someInvalidCode');
//         expect(response.statusCode).toBe(500);
//         expect(response.text).toContain('Authentication error');
//     });

//     afterEach(() => {
//         axios.post.mockReset(); // Reset the mock after each test
//     });
// });
