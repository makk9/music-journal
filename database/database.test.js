
const { db, addUser, addTrack, addJournalEntry } = require('./database');

// Initialize database schema for testing
beforeAll((done) => {
    db.serialize(() => {

        // Enable foreign key support
        db.run("PRAGMA foreign_keys = ON;", (err) => {
            if (err) {
                console.error("Error enabling foreign key support:", err.message);
            }
        });

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
test('addUser adds users to the database', function (done) {
    const testUser1 = {
        userID: 'testUser1',
        username: 'Test User1',
        email: 'testuser1@example.com'
    };

    const testUser2 = {
        userID: 'testUser2',
        username: 'Test User2',
        email: 'testuser2@example.com'
    };

    // Add user to database
    addUser(testUser1, function (err, userID) {
        expect(err).toBeNull(); // Expect no error
        expect(userID).toEqual(testUser1.userID); // Expect the added userID to be the same as the input

        // Verify the user was added to the database
        db.get(`SELECT * FROM users WHERE userID = ?`, [userID], function (err, row) {
            expect(err).toBeNull(); // Expect no error on retrieval
            expect(row).not.toBeNull(); // Expect a user to be found
            expect(row.username).toEqual(testUser1.username); // Expect the username to match
            expect(row.email).toEqual(testUser1.email); // Expect the email to match
        });

        // Add new user to database
        addUser(testUser2, function (err, userID) {
            expect(err).toBeNull();
            expect(userID).toEqual(testUser2.userID);

            db.get(`SELECT * FROM users WHERE userID = ?`, [userID], function (err, row) {
                expect(err).toBeNull();
                expect(row).not.toBeNull();
                expect(row.username).toEqual(testUser2.username);
                expect(row.email).toEqual(testUser2.email);

                // check count of users added in database
                db.get(`SELECT COUNT(userID) AS userCount FROM users`, [], function (err, countResult) {
                    expect(err).toBeNull();
                    expect(countResult.userCount).toBe(2);
                });

                // Add duplicate user to database
                addUser(testUser1, function (err) {
                    expect(err.message).toBe("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email");

                    // check count of users stays the same and duplicate user is not added
                    db.get(`SELECT COUNT(userID) AS userCount FROM users`, [], function (err, countResult) {
                        expect(err).toBeNull();
                        expect(countResult.userCount).toBe(2);
                        done();
                    });
                });
            });
        });
    });
});


// Test addTrack function
test('addTrack adds tracks to the database', function (done) {
    const testTrack1 = {
        trackID: 'testTrack1',
        spotifyTrackID: 'testTrack1',
        title: 'I Beat Them All',
        artist: 'Daniel Pemberton',
        album: 'Spider-Man: Across the Spiderverse'
    };

    const testTrack2 = {
        trackID: 'testTrack2',
        spotifyTrackID: 'testTrack2',
        title: 'Destroyer Of Worlds',
        artist: 'Ludwig Goransson',
        album: 'Oppenheimer'
    };

    // Add track to database
    addTrack(testTrack1, function (err, trackID) {
        expect(err).toBeNull(); // Expect no error
        expect(trackID).toEqual(testTrack1.trackID); // Expect the added trackID to be the same as the input

        // Verify the track was added to the database
        db.get(`SELECT * FROM tracks WHERE trackID = ?`, [trackID], function (err, row) {
            expect(err).toBeNull(); // Expect no error on retrieval
            expect(row).not.toBeNull(); // Expect a track to be found
            expect(row.spotifyTrackID).toEqual(testTrack1.spotifyTrackID); // Expect the spotifyTrackID to match
            expect(row.title).toEqual(testTrack1.title); // Expect the title to match
        });

        // Add new track to database
        addTrack(testTrack2, function (err, trackID) {
            expect(err).toBeNull();
            expect(trackID).toEqual(testTrack2.trackID);

            db.get(`SELECT * FROM tracks WHERE trackID = ?`, [trackID], function (err, row) {
                expect(err).toBeNull();
                expect(row).not.toBeNull();
                expect(row.spotifyTrackID).toEqual(testTrack2.spotifyTrackID);
                expect(row.title).toEqual(testTrack2.title);

                // check count of tracks added in database
                db.get(`SELECT COUNT(trackID) AS trackCount FROM tracks`, [], function (err, countResult) {
                    expect(err).toBeNull();
                    expect(countResult.trackCount).toBe(2);
                });

                // Add duplicate track to database
                addTrack(testTrack1, function (err) {
                    expect(err.message).toBe("SQLITE_CONSTRAINT: UNIQUE constraint failed: tracks.trackID");

                    // check count of tracks stays the same and duplicate track is not added
                    db.get(`SELECT COUNT(trackID) AS trackCount FROM tracks`, [], function (err, countResult) {
                        expect(err).toBeNull();
                        expect(countResult.trackCount).toBe(2);
                        done();
                    });
                });
            });
        });
    });
});


// Test addJournalEntry function
test('addJournalEntry adds journal entries to the database', function (done) {
    const testEntry1 = {
        entryID: 'testEntry1',
        userID: 'testUser1',
        trackID: 'testTrack1',
        entryText: 'This song reminds me of summer...',
        imageURL: 'http://Batman.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const testEntry2 = {
        entryID: 'testEntry2',
        userID: 'testUser2',
        trackID: 'testTrack2',
        entryText: 'The only thing that kept me going during finals...',
        imageURL: 'http://Studying.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const testInvalidUserEntry = {
        entryID: 'testEntry3',
        userID: 'testUser3', // this user does not exist in our testing database schema
        trackID: 'testTrack2',
        entryText: 'I read my manga with this track playing the wholetime...',
        imageURL: 'http://manga.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    const testInvalidTrackEntry = {
        entryID: 'testEntry3',
        userID: 'testUser2',
        trackID: 'testTrack3', // this track does not exist in our testing database schema
        entryText: 'I read my manga with this track playing the wholetime...',
        imageURL: 'http://manga.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    // Add journal entry to database    
    addJournalEntry(testEntry1, function (err, entryID) {
        expect(err).toBeNull();
        expect(entryID).toEqual(testEntry1.entryID);

        // Verify the journal entry was added to the database
        db.get(`SELECT * FROM journal_entries WHERE entryID = ?`, [entryID], function (err, row) {
            expect(err).toBeNull();
            expect(row).not.toBeNull();
            expect(row.userID).toEqual(testEntry1.userID);
            expect(row.trackID).toEqual(testEntry1.trackID);
            expect(row.entryText).toEqual(testEntry1.entryText);
        });

        // Add new journal entry to database
        addJournalEntry(testEntry2, function (err, entryID) {
            expect(err).toBeNull();
            expect(entryID).toEqual(testEntry2.entryID);

            db.get(`SELECT * FROM journal_entries WHERE entryID = ?`, [entryID], function (err, row) {
                expect(err).toBeNull();
                expect(row).not.toBeNull();
                expect(row.userID).toEqual(testEntry2.userID);
                expect(row.trackID).toEqual(testEntry2.trackID);
                expect(row.entryText).toEqual(testEntry2.entryText);

                // check count of journal entries added in database
                db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                    expect(err).toBeNull();
                    expect(countResult.entryCount).toBe(2);
                });

                // Add duplicate journal entry to database
                addJournalEntry(testEntry1, function (err) {
                    expect(err.message).toBe("SQLITE_CONSTRAINT: UNIQUE constraint failed: journal_entries.entryID");

                    // check count of journal entries stays the same and duplicate journal entry is not added
                    db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                        expect(err).toBeNull();
                        expect(countResult.entryCount).toBe(2);
                    });

                    // Add journal entry with invalid linked userID
                    addJournalEntry(testInvalidUserEntry, function (err) {
                        expect(err.message).toBe("SQLITE_CONSTRAINT: FOREIGN KEY constraint failed");

                        // check count of journal entries stays the same and invalid journal entry is not added
                        db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                            expect(err).toBeNull();
                            expect(countResult.entryCount).toBe(2);

                            // Add journal entry with invalid linked trackID
                            addJournalEntry(testInvalidTrackEntry, function (err) {
                                expect(err.message).toBe("SQLITE_CONSTRAINT: FOREIGN KEY constraint failed");

                                // check count of journal entries stays the same and invalid journal entry is not added
                                db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                                    expect(err).toBeNull();
                                    expect(countResult.entryCount).toBe(2);
                                    done();
                                });
                            })
                        });
                    })
                });
            });
        });
    });
});






