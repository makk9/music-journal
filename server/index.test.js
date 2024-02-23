const request = require('supertest');
const { app, generateRandomString } = require('./index');
const axios = require('axios');

jest.mock('axios');

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

// Tests createUserAfterSpotifyAuth function 
describe('createUserAfterSpotifyAuth', function () {
})


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
