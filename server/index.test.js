const request = require('supertest');
const { app, generateRandomString, fetchSpotifyUserProfile, authenticateUser } = require('./index');
const axios = require('axios');
const { db, getUserBySpotifyID } = require('../database/database');

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
describe('authenticateUser Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { headers: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    it('responds with 401 if access token is missing', async () => {
        await authenticateUser(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.send).toHaveBeenCalledWith('Access token required');
    });

    it('responds with 401 if access token is invalid', async () => {
        mockReq.headers.authorization = 'Bearer invalidToken';

        // Simulating fetchSpotifyProfile by using axios mock
        axios.get.mockRejectedValueOnce(null);

        await authenticateUser(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.send).toHaveBeenCalledWith('Invalid access token');
    });

    it('responds with 404 if user not found in database', async () => {
        mockReq.headers.authorization = 'Bearer validToken';
        // Simulating fetchSpotifyProfile
        axios.get.mockResolvedValueOnce({ data: { id: 'user123' } });
        db.getUserBySpotifyID.mockResolvedValue(null);

        await authenticateUser(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith('User not found');
    });

    it('calls next() for successful authentication', async () => {
        const userProfile = { id: 'user123', name: 'Test User' };
        const userInDb = { id: 'user123', name: 'Test User', email: 'test@example.com' };

        mockReq.headers.authorization = 'Bearer validToken';
        axios.get.mockRejectedValueOnce(userProfile);
        db.getUserBySpotifyID.mockResolvedValue(userInDb);

        await authenticateUser(mockReq, mockRes, mockNext);
        expect(mockReq.user).toEqual(userInDb);
        expect(mockNext).toHaveBeenCalled();
    });

    // Reset mocks after each test
    afterEach(() => {
        jest.clearAllMocks();
    });
});



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
