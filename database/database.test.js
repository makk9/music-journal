
const { db, addUser } = require('./database');

// Initialize database schema for testing
beforeAll((done) => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
        userID TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      );`);

        db.run(`CREATE TABLE IF NOT EXISTS tracks (
        trackID TEXT PRIMARY KEY,
        spotifyTrackID TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL
      );`);

        db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
        entryID TEXT PRIMARY KEY,
        userID TEXT NOT NULL,
        trackID TEXT NOT NULL,
        entryText TEXT NOT NULL,
        imageURL TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY(userID) REFERENCES users(userID),
        FOREIGN KEY(trackID) REFERENCES tracks(trackID)
      );`, done); // 'done' callback to ensure the schema is set up before tests run
    });
});

afterAll(() => {
    db.close();
});


// Test addUser function
test('addUser adds a user to the database', done => {
    const testUser = {
        userID: 'testUser1',
        username: 'Test User',
        email: 'testuser@example.com'
    };

    addUser(testUser, (err, userID) => {
        expect(err).toBeNull(); // Expect no error
        expect(userID).toEqual(testUser.userID); // Expect the added userID to be the same as the input

        // Verify the user was added to the database
        db.get(`SELECT * FROM users WHERE userID = ?`, [userID], (err, row) => {
            expect(err).toBeNull(); // Expect no error on retrieval
            expect(row).not.toBeNull(); // Expect a user to be found
            expect(row.username).toEqual(testUser.username); // Expect the username to match
            expect(row.email).toEqual(testUser.email); // Expect the email to match
            done(); // Indicate the end of the test
        });

    });
});
