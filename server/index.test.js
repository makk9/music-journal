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
    addJournalEntry: jest.fn(),
    getJournalEntriesByTrackID: jest.fn(),
    updateJournalEntry: jest.fn(),
    deleteJournalEntry: jest.fn(),
}));
const { getUserBySpotifyID, createUserAfterSpotifyAuth, addTrack, addJournalEntry, getJournalEntriesByTrackID,
    updateJournalEntry, deleteJournalEntry } = require('../database/database');


// TESTING UTILITY FUNCTIONS 

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


// TESTING MIDDLEWARE

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

// TESTING ROUTES

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

// Tests GET /auth/callback endpoint
describe('GET /auth/callback endpoint', () => {
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

// Tests POST /track endpoint
describe('POST /track endpoint', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('successfully adds a track for an authenticated user', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock successful track addition in the database
        addTrack.mockImplementation((track, callback) => {
            // Simulate a successful database operation by calling the callback with null error and the trackID
            callback(null, track.trackID);
        });

        const trackData = {
            spotifyTrackID: '123',
            title: 'Test Track',
            artist: 'Test Artist',
            album: 'Test Album'
        };

        const response = await request(app)
            .post('/track')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(trackData)
            .expect(201); // Expecting HTTP status code 201 for successful creation
    });

    it('returns an error when addTrack fails', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock unsuccessful track addition in the database
        addTrack.mockImplementation((track, callback) => {
            const error = new Error('Failed to add track to database');
            callback(error, null);
        });

        const trackData = {
            spotifyTrackID: '123',
            title: 'Test Track',
            artist: 'Test Artist',
            album: 'Test Album'
        };

        const response = await request(app)
            .post('/track')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(trackData)
            .expect(500); // Expecting HTTP status code 500 for unsuccessful creation
    });

    it('returns an error when authentication fails', async () => {
        axios.get.mockRejectedValueOnce(new Error('Failed to authenticate'));

        // Mock successful track addition in the database
        addTrack.mockImplementation((track, callback) => {
            // Simulate a successful database operation by calling the callback with null error and the trackID
            callback(null, track.trackID);
        });

        const trackData = {
            spotifyTrackID: '123',
            title: 'Test Track',
            artist: 'Test Artist',
            album: 'Test Album'
        };

        const response = await request(app)
            .post('/track')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(trackData)
            .expect(401); // Expecting HTTP status code 401 for authentication failure
    });
});

// Tests POST /journal endpoint
describe('POST /journal endpoint', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('successfully adds a journal entry for an authenticated user', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock successful journal addition in the database
        addJournalEntry.mockImplementation((journalData, callback) => {
            // Simulate a successful database operation by calling the callback with null error and the entryID
            callback(null, journalData.entryID);
        });

        const journalData = {
            entryID: 'testEntry1',
            userID: 'testUser1',
            trackID: 'testTrack1',
            entryText: 'This song reminds me of summer...',
            imageURL: 'http://Batman.jpg',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const response = await request(app)
            .post('/journal')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(journalData)
            .expect(201); // Expecting HTTP status code 201 for successful creation
    });

    it('returns an error when addJournalEntry fails', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock unsuccessful journal addition in the database
        addJournalEntry.mockImplementation((journalData, callback) => {
            // Simulate a unsuccessful database operation by calling the callback with error
            const error = new Error('Failed to add journal entry to database');
            callback(error, null);
        });

        const journalData = {
            entryID: 'testEntry1',
            userID: 'testUser1',
            trackID: 'testTrack1',
            entryText: 'This song reminds me of summer...',
            imageURL: 'http://Batman.jpg',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const response = await request(app)
            .post('/journal')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(journalData)
            .expect(500); // Expecting HTTP status code 500 for unsuccessful creation
    });

    it('returns an error when authentication fails', async () => {
        axios.get.mockRejectedValueOnce(new Error('Failed to authenticate'));

        // Mock successful journal addition in the database
        addJournalEntry.mockImplementation((journalData, callback) => {
            // Simulate a successful database operation by calling the callback with null error and the entryID
            callback(null, journalData.entryID);
        });

        const journalData = {
            entryID: 'testEntry1',
            userID: 'testUser1',
            trackID: 'testTrack1',
            entryText: 'This song reminds me of summer...',
            imageURL: 'http://Batman.jpg',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const response = await request(app)
            .post('/track')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(journalData)
            .expect(401); // Expecting HTTP status code 401 for authentication failure
    });
});


// Tests GET /journal/:trackId endpoint
describe('GET /journal/:trackId endpoint', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('successfully gets a journal entry by track for an authenticated user', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        const mockEntries = [{ id: 'entry1', text: 'Loved this track!', trackId: 'testTrack1', userId: 'testUser1' }];
        // Mock successful journal retrieval in the database
        getJournalEntriesByTrackID.mockImplementation((trackID, userID, callback) => {
            // Simulate a successful database operation by calling the callback with null error and entries
            callback(null, mockEntries);
        });

        const getJournalData = {
            trackID: 'testTrack1',
            userID: 'testUser1'
        };

        const response = await request(app)
            .get('/journal/:testTrack1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(getJournalData)
            .expect(200); // Expecting HTTP status code 200 for successful retrieval

        expect(response.body).toEqual(mockEntries);
    });

    it('returns an error when getJournalEntriesByTrackID fails', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        const mockEntries = [{ id: 'entry1', text: 'Loved this track!', trackId: 'testTrack1', userId: 'testUser1' }];
        // Mock unsuccessful journal retrieval in the database
        getJournalEntriesByTrackID.mockImplementation((trackID, userID, callback) => {
            // Simulate a unsuccessful database operation by calling the callback with error
            const error = new Error('Failed to get journal entry from database');
            callback(error, null);
        });

        const getJournalData = {
            trackID: 'testTrack1',
            userID: 'testUser1'
        };

        const response = await request(app)
            .get('/journal/:testTrack1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(getJournalData)
            .expect(500); // Expecting HTTP status code 200 for unsuccessful retrieval

        expect(response.body).toEqual({});
    });
});

it('returns an error when authentication fails', async () => {

    axios.get.mockRejectedValueOnce(new Error('Failed to authenticate'));

    // Mock successful journal retrieval in the database
    getJournalEntriesByTrackID.mockImplementation((trackID, userID, callback) => {
        // Simulate a successful database operation by calling the callback with null error and entries
        const error = new Error('Failed to get journal entry from database');
        callback(error, null);
    });

    const getJournalData = {
        trackID: 'testTrack1',
        userID: 'testUser1'
    };

    const response = await request(app)
        .get('/journal/:testTrack1')
        .set('Cookie', [`accessToken=valid_mock_access_token`])
        .send(getJournalData)
        .expect(401); // Expecting HTTP status code 401 for authentication failure

    expect(response.body).toEqual({});
});


// Tests PUT /journal/:entryID endpoint
describe('PUT /journal/:entryId endpoint', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('successfully updates journal entry for an authenticated user', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock successful journal update in the database
        updateJournalEntry.mockImplementation((entryID, userID, data, callback) => {
            callback(null);
        });

        const updateJournalData = {
            entryID: 'testEntry1',
            userID: 'testUser1',
            entryText: 'Hello',
            imageURL: null,
            updatedAt: new Date().toISOString()
        };

        const response = await request(app)
            .put('/journal/:testEntry1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(updateJournalData)
            .expect(200); // Expecting HTTP status code 200 for successful update

        expect(response.text).toBe('Journal entry updated');
    });

    it('returns an error when updateJournalEntry fails', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock unsuccessful journal update in the database
        updateJournalEntry.mockImplementation((entryID, userID, data, callback) => {
            callback(new Error('Failed to update journal entry'));
        });

        const updateJournalData = {
            entryID: 'testEntry1',
            userID: 'testUser1',
            entryText: 'Hello',
            imageURL: null,
            updatedAt: new Date().toISOString()
        };

        const response = await request(app)
            .put('/journal/:testTrack1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(updateJournalData)
            .expect(500); // Expecting HTTP status code 200 for unsuccessful retrieval

        expect(response.text).toContain('Failed to update journal entry');
    });

    it('returns an error when authentication fails', async () => {

        axios.get.mockRejectedValueOnce(new Error('Failed to authenticate'));

        // Mock successful journal update in the database
        updateJournalEntry.mockImplementation((entryID, userID, data, callback) => {
            callback(null);
        });

        const updateJournalData = {
            entryID: 'testEntry1',
            userID: 'testUser1',
            entryText: 'Hello',
            imageURL: null,
            updatedAt: new Date().toISOString()
        };


        const response = await request(app)
            .put('/journal/:testTrack1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(updateJournalData)
            .expect(401); // Expecting HTTP status code 401 for authentication failure
    });
});


// Tests DELETE /journal/:entryID endpoint
describe('DELETE /journal/:entryId endpoint', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('successfully deletes journal entry for an authenticated user', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock successful journal deletion from the database
        deleteJournalEntry.mockImplementation((entryID, userID, callback) => {
            callback(null);
        });

        const deleteJournalData = {
            entryID: 'testEntry1',
            userID: 'testUser1'
        };

        const response = await request(app)
            .delete('/journal/:testEntry1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(deleteJournalData)
            .expect(200); // Expecting HTTP status code 200 for successful deletion

        expect(response.text).toBe('Journal entry deleted');
    });

    it('returns an error when deleteJournalEntry fails', async () => {

        const mockUserProfile = { id: 'user-id', name: 'Test User' };
        const mockUserRow = { id: 'user-id', name: 'Test User', spotifyId: 'user-id' };
        axios.get.mockResolvedValue({
            data: mockUserProfile // Mocked response data for axios found in 'fetchSpotifyProfile'
        });
        getUserBySpotifyID.mockImplementation((id, callback) => callback(null, mockUserRow));

        // Mock unsuccessful journal deletion from the database
        deleteJournalEntry.mockImplementation((entryID, userID, callback) => {
            callback(new Error('Failed to delete journal entry'));
        });

        const deleteJournalData = {
            entryID: 'testEntry1',
            userID: 'testUser1'
        };

        const response = await request(app)
            .delete('/journal/:testTrack1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(deleteJournalData)
            .expect(500); // Expecting HTTP status code 200 for unsuccessful deletion

        expect(response.text).toContain('Failed to delete journal entry');
    });

    it('returns an error when authentication fails', async () => {

        axios.get.mockRejectedValueOnce(new Error('Failed to authenticate'));

        // Mock successful journal deletion from the database
        deleteJournalEntry.mockImplementation((entryID, userID, callback) => {
            callback(null);
        });

        const deleteJournalData = {
            entryID: 'testEntry1',
            userID: 'testUser1'
        };


        const response = await request(app)
            .delete('/journal/:testTrack1')
            .set('Cookie', [`accessToken=valid_mock_access_token`])
            .send(deleteJournalData)
            .expect(401); // Expecting HTTP status code 401 for authentication failure
    });
});



