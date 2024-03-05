const { db, addUser, getUserBySpotifyID, addTrack, addJournalEntry, getJournalEntriesByTrackID,
    updateJournalEntry, deleteJournalEntry, checkUserExists, createUserAfterSpotifyAuth } = require('./database');
jest.mock('../utils/encryption', () => ({
    encrypt: jest.fn().mockImplementation((text) => `encrypted-${text}`),
    decrypt: jest.fn().mockImplementation((text) => text.replace('encrypted-', '')),
}));
// const { encrypt, decrypt } = require('../utils/encryption');
// const encryptionKey = process.env.ENCRYPTION_KEY;

// Initialize database schema for testing
beforeAll(function (done) {
    db.serialize(function () {

        // Enable foreign key support
        db.run("PRAGMA foreign_keys = ON;", function (err) {
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
        spotifyTrackID TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL
      );`);

        db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
        entryID TEXT PRIMARY KEY,
        userID TEXT NOT NULL,
        trackID TEXT NOT NULL,
        entryTitle TEXT NOT NULL,
        entryText TEXT NOT NULL,
        imageURL TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY(userID) REFERENCES users(userID),
        FOREIGN KEY(trackID) REFERENCES tracks(spotifyTrackID)
      );`, done); // 'done' callback to ensure the schema is set up before tests run
    });
});

afterAll(function () {
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

    // TEST 1: Add user to database
    addUser(testUser1, function (err, userID) {
        expect(err).toBeNull(); // Expect no error
        expect(userID).toEqual(testUser1.userID); // Expect the added userID to be the same as the input

        // Verify the user was added to the database
        db.get(`SELECT * FROM users WHERE userID = ?`, [userID], function (err, row) {
            expect(err).toBeNull(); // Expect no error on retrieval
            expect(row).not.toBeNull(); // Expect a user to be found
            expect(row.username).toEqual(testUser1.username); // Expect the username to match
            expect(row.email).toEqual(testUser1.email); // Expect the email to match

            // TEST 2: Add new user to database
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

                        // TEST 3: Add duplicate user to database
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
    });
});

// Test getUserBySpotifyID function
test('getUserBySpotifyID gets user by spotify ID from database', function (done) {
    const validUserID1 = 'testUser1';
    const testUser1 = {
        userID: 'testUser1',
        username: 'Test User1',
        email: 'testuser1@example.com'
    };
    const invalidUserID2 = 'testUser3';

    // TEST 1: Get valid user ID from database
    getUserBySpotifyID(validUserID1, function (err, user) {
        expect(err).toBeNull();
        expect(user).toEqual(testUser1);

        // TEST 2: Get invalid userID from database
        getUserBySpotifyID(invalidUserID2, function (err, user) {
            expect(err).toBeNull();
            expect(user).toBeUndefined();
            done();
        });
    });
});

// Test addTrack function
test('addTrack adds tracks to the database', function (done) {
    const testTrack1 = {
        spotifyTrackID: 'testTrack1',
        title: 'I Beat Them All',
        artist: 'Daniel Pemberton',
        album: 'Spider-Man: Across the Spiderverse'
    };

    const testTrack2 = {
        spotifyTrackID: 'testTrack2',
        title: 'Destroyer Of Worlds',
        artist: 'Ludwig Goransson',
        album: 'Oppenheimer'
    };

    // TEST 1: Add track to database
    addTrack(testTrack1, function (err, spotifyTrackID) {
        expect(err).toBeNull(); // Expect no error
        expect(spotifyTrackID).toEqual(testTrack1.spotifyTrackID); // Expect the added trackID to be the same as the input

        // Verify the track was added to the database
        db.get(`SELECT * FROM tracks WHERE spotifyTrackID = ?`, [spotifyTrackID], function (err, row) {
            expect(err).toBeNull(); // Expect no error on retrieval
            expect(row).not.toBeNull(); // Expect a track to be found
            expect(row.spotifyTrackID).toEqual(testTrack1.spotifyTrackID); // Expect the spotifyTrackID to match
            expect(row.title).toEqual(testTrack1.title); // Expect the title to match

            // TEST 2: Add new track to database
            addTrack(testTrack2, function (err, spotifyTrackID) {
                expect(err).toBeNull();
                expect(spotifyTrackID).toEqual(testTrack2.spotifyTrackID);

                db.get(`SELECT * FROM tracks WHERE spotifyTrackID = ?`, [spotifyTrackID], function (err, row) {
                    expect(err).toBeNull();
                    expect(row).not.toBeNull();
                    expect(row.spotifyTrackID).toEqual(testTrack2.spotifyTrackID);
                    expect(row.title).toEqual(testTrack2.title);

                    // check count of tracks added in database
                    db.get(`SELECT COUNT(spotifyTrackID) AS trackCount FROM tracks`, [], function (err, countResult) {
                        expect(err).toBeNull();
                        expect(countResult.trackCount).toBe(2);

                        // TEST 3: Add duplicate track to database
                        addTrack(testTrack1, function (err) {

                            // check count of tracks stays the same and duplicate track is not added
                            db.get(`SELECT COUNT(spotifyTrackID) AS trackCount FROM tracks`, [], function (err, countResult) {
                                expect(err).toBeNull();
                                expect(countResult.trackCount).toBe(2);
                                done();
                            });
                        });
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
        entryTitle: 'Summer Memories',
        entryText: 'This song reminds me of summer...',
        imageURL: 'http://Batman.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const testEntry2 = {
        entryID: 'testEntry2',
        userID: 'testUser2',
        trackID: 'testTrack2',
        entryTitle: 'Finalssssssss',
        entryText: 'The only thing that kept me going during finals...',
        imageURL: 'http://Studying.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const testInvalidUserEntry = {
        entryID: 'testEntry3',
        userID: 'testUser3', // this user does not exist in our testing database schema
        trackID: 'testTrack2',
        entryTitle: 'SHARIGANN!!!',
        entryText: 'I read my manga with this track playing the wholetime...',
        imageURL: 'http://manga.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    const testInvalidTrackEntry = {
        entryID: 'testEntry3',
        userID: 'testUser2',
        trackID: 'testTrack3', // this track does not exist in our testing database schema
        entryTitle: 'SHARIGANN!!!',
        entryText: 'I read my manga with this track playing the wholetime...',
        imageURL: 'http://manga.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    // TEST 1: Add journal entry to database    
    addJournalEntry(testEntry1, function (err, entryID) {
        expect(err).toBeNull();
        expect(entryID).toEqual(testEntry1.entryID);

        // Verify the journal entry was added to the database
        db.get(`SELECT * FROM journal_entries WHERE entryID = ?`, [entryID], function (err, row) {
            expect(err).toBeNull();
            expect(row).not.toBeNull();
            expect(row.userID).toEqual(testEntry1.userID);
            expect(row.trackID).toEqual(testEntry1.trackID);
            expect(row.entryText).toEqual(`encrypted-${testEntry1.entryText}`);

            // TEST 2: Add new journal entry to database
            addJournalEntry(testEntry2, function (err, entryID) {
                expect(err).toBeNull();
                expect(entryID).toEqual(testEntry2.entryID);

                db.get(`SELECT * FROM journal_entries WHERE entryID = ?`, [entryID], function (err, row) {
                    expect(err).toBeNull();
                    expect(row).not.toBeNull();
                    expect(row.userID).toEqual(testEntry2.userID);
                    expect(row.trackID).toEqual(testEntry2.trackID);
                    expect(row.entryText).toEqual(`encrypted-${testEntry2.entryText}`);

                    // check count of journal entries added in database
                    db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                        expect(err).toBeNull();
                        expect(countResult.entryCount).toBe(2);

                        // TEST 3: Add duplicate journal entry to database
                        addJournalEntry(testEntry1, function (err) {
                            expect(err.message).toBe("SQLITE_CONSTRAINT: UNIQUE constraint failed: journal_entries.entryID");

                            // check count of journal entries stays the same and duplicate journal entry is not added
                            db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                                expect(err).toBeNull();
                                expect(countResult.entryCount).toBe(2);

                                // TEST 4: Add journal entry with invalid linked userID
                                addJournalEntry(testInvalidUserEntry, function (err) {
                                    expect(err.message).toBe("SQLITE_CONSTRAINT: FOREIGN KEY constraint failed");

                                    // check count of journal entries stays the same and invalid journal entry is not added
                                    db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                                        expect(err).toBeNull();
                                        expect(countResult.entryCount).toBe(2);

                                        // TEST 5: Add journal entry with invalid linked trackID
                                        addJournalEntry(testInvalidTrackEntry, function (err) {
                                            expect(err.message).toBe("SQLITE_CONSTRAINT: FOREIGN KEY constraint failed");

                                            // check count of journal entries stays the same and invalid journal entry is not added
                                            db.get(`SELECT COUNT(entryID) AS entryCount FROM journal_entries`, [], function (err, countResult) {
                                                expect(err).toBeNull();
                                                expect(countResult.entryCount).toBe(2);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});


// Test getJournalEntriesByTrackID function
test('getJournalEntriesByTrackID gets journal entries by trackID from the database', function (done) {
    const testTrackID1 = 'testTrack1'; // valid trackID in testing database schema
    const invalidTrackID = 'testTrack4'; // invalid trackID not in testing database schema
    const testUserID1 = 'testUser1'; // valid userID in testing database schema
    const invalidUserID = 'BATMAN'; // invalid userID not in testing database schema

    const testEntry3 = {
        entryID: 'testEntry3',
        userID: 'testUser1', // linking entry to same valid userID as above
        trackID: 'testTrack1', // linking entry to same valid trackID as above 
        entryText: 'I love this track so much, I want to write about it again!',
        imageURL: 'http://Studying.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };


    // TEST 1: Get journal entry with a valid trackID and valid userID    
    getJournalEntriesByTrackID(testTrackID1, testUserID1, function (err, entries) {
        expect(err).toBeNull();
        expect(entries).toHaveLength(1); // check how many entries associated with track
        expect(entries[0].entryText).toEqual('This song reminds me of summer...'); // check entry text content associated with trackID

        // Add another journal entry associated with existing trackID from above to database
        addJournalEntry(testEntry3, function (err, entryID) {

            // TEST 2: Get multiple journal entries associated with trackID and user ID
            getJournalEntriesByTrackID(testTrackID1, testUserID1, function (err, entries) {
                expect(err).toBeNull();
                expect(entries).toHaveLength(2); // check to see we are getting multiple journal entries associated with trackID

                // TEST 3: Get journal entries associated with invalid trackID and valid userID
                getJournalEntriesByTrackID(invalidTrackID, testUserID1, function (err, entries) {
                    expect(err).toBeNull();
                    expect(entries).toHaveLength(0); // check to see we are getting 0 entries for an invalid trackID query

                    // TEST 4: Get journal entries associated with valid trackID and invalid userID
                    getJournalEntriesByTrackID(testTrackID1, invalidUserID, function (err, entries) {
                        expect(err).toBeNull();
                        expect(entries).toHaveLength(0); // check to see we are getting 0 entries for an invalid userID query

                        // TEST 5: Get journal entries associated with invalid trackID and invalid userID
                        getJournalEntriesByTrackID(invalidTrackID, invalidUserID, function (err, entries) {
                            expect(err).toBeNull();
                            expect(entries).toHaveLength(0); // check to see we are getting 0 entries for an invalid trackID and invalid userID query
                            done();
                        });
                    });
                });
            });
        });
    });
});

// Test updateJournalEntry function
test('updateJournalEntry updates journal entry in the database', function (done) {
    const testEntryID1 = 'testEntry1';
    const testUserID1 = 'testUser1';
    const invalidEntryID = 'testEntry56';
    const invalidUserID = 'testUser7';

    // valid full data payload to update journal entry
    const validFullData = {
        entryText: 'This song reminds me of summer...Now in the spring, I love sitting out in the warm sunny grass listening to this.',
        imageURL: 'BATMAN.jpg',
        updatedAt: new Date().toISOString()
    }
    // valid data payload with only text to update journal entry
    const validTextData = {
        entryText: 'This song reminds me of summer...Now in the spring, I love sitting out in the warm sunny grass listening to this.',
        updatedAt: new Date().toISOString()
    }
    // valid data payload with only image to update journal entry
    const validImgData = {
        imageURL: 'BATMAN.jpg',
        updatedAt: new Date().toISOString()
    }

    // TEST 1: Update journal entry with valid entryID, valid userID, and a full data payload
    updateJournalEntry(testEntryID1, testUserID1, validFullData, function (err, entryID) {
        expect(err).toBeNull();

        // Verify the journal entry was updated correctly
        db.get("SELECT * FROM journal_entries WHERE entryID = ?", [entryID], function (err, row) {
            expect(err).toBeNull();
            expect(row).not.toBeNull();
            expect(row.entryText).toBe(`encrypted-${validFullData.entryText}`);
            expect(row.imageURL).toBe(`encrypted-${validFullData.imageURL}`);
            expect(row.updatedAt).toBe(validFullData.updatedAt);

            // TEST 2: Update journal entry with invalid entryID, valid userID, and a full data payload
            updateJournalEntry(invalidEntryID, testUserID1, validFullData, function (err) {
                expect(err.message).toBe("No journal entry found with that ID.");

                // TEST 3: Update journal entry with valid entryID, invalid userID, and a full data payload
                updateJournalEntry(testEntryID1, invalidUserID, validFullData, function (err) {
                    expect(err.message).toBe("No journal entry found with that ID.");

                    // TEST 4: Update journal entry with invalid entryID, invalid userID, and a full data payload
                    updateJournalEntry(invalidEntryID, invalidUserID, validFullData, function (err) {
                        expect(err.message).toBe("No journal entry found with that ID.");

                        // TEST 5: Update journal entry with valid entryID, valid userID, and minus image data payload
                        updateJournalEntry(testEntryID1, testUserID1, validTextData, function (err, entryID) {
                            expect(err).toBeNull();

                            // Verify the journal entry was updated correctly
                            db.get("SELECT * FROM journal_entries WHERE entryID = ?", [entryID], function (err, row) {
                                expect(err).toBeNull();
                                expect(row).not.toBeNull();
                                expect(row.entryText).toBe(`encrypted-${validTextData.entryText}`);
                                expect(row.imageURL).toBe("encrypted-BATMAN.jpg"); // imageURL stays the same for this entry
                                //expect(row.updatedAt).toBe(validFullData.updatedAt);

                                // TEST 6: Update journal entry with valid entryID, valid userID, and minus text data payload
                                updateJournalEntry(testEntryID1, testUserID1, validImgData, function (err, entryID) {
                                    expect(err).toBeNull();

                                    // Verify the journal entry was updated correctly
                                    db.get("SELECT * FROM journal_entries WHERE entryID = ?", [entryID], function (err, row) {
                                        expect(err).toBeNull();
                                        expect(row).not.toBeNull();
                                        expect(row.entryText).toBe(`encrypted-${validTextData.entryText}`); // entryText stays the same for this entry
                                        expect(row.imageURL).toBe(`encrypted-${validImgData.imageURL}`);
                                        expect(row.updatedAt).toBe(validFullData.updatedAt);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});


// Test deleteJournalEntry function
test('deleteJournalEntry deletes journal entries from the database', function (done) {
    const testEntryID1 = 'testEntry1';
    const testEntryID2 = 'testEntry2';
    const testUserID1 = 'testUser1';
    const invalidUserID = 'testUser7';

    // Verify the journal entries count linked with userID before deletion
    db.get("SELECT COUNT(*) AS count FROM journal_entries WHERE userID = ?", [testUserID1], function (err, result) {
        expect(err).toBeNull();
        expect(result.count).toBe(2); // testUserID1 has 2 journal entry before deletion(testEntry1 and testEntry3)

        // TEST 1: Delete journal entry from database    
        deleteJournalEntry(testEntryID1, testUserID1, function (err) {
            expect(err).toBeNull();

            // Verify the journal entry was deleted
            db.get("SELECT * FROM journal_entries WHERE entryID = ? AND userID = ?", [testEntryID1, testUserID1], function (err, row) {
                expect(err).toBeNull();
                expect(row).toBeUndefined(); // No entry should be found

                // Verify the journal entries count linked with userID after deletion
                db.get("SELECT COUNT(*) AS count FROM journal_entries WHERE userID = ?", [testUserID1], function (err, result) {
                    expect(err).toBeNull();
                    expect(result.count).toBe(1); // testUserID1 has 0 journal entries after deletion

                    // TEST 2: Deletes non-existent journal entry with valid userID from database
                    deleteJournalEntry(testEntryID1, testUserID1, function (err, entryID) {
                        expect(err.message).toBe("No journal entry found with that ID.");

                        // TEST 3: Deletes existent journal entry with invalid userID from database
                        deleteJournalEntry(testEntryID2, invalidUserID, function (err) {
                            expect(err.message).toBe("No journal entry found with that ID.");

                            // TEST 4: Deletes non-existent journal entry with invalid userID from database
                            deleteJournalEntry(testEntryID1, invalidUserID, function (err) {
                                expect(err.message).toBe("No journal entry found with that ID.");
                                done();
                            })
                        });
                    });
                });
            });
        });
    });
});

// Test checkUserExists function
test('checkUserExists checks if user exists in the database', function (done) {
    const validEmail1 = 'testuser1@example.com';
    const invalidEmail = 'batman@iambatman.com';

    // TEST 1: Check if valid user exists in database
    checkUserExists(validEmail1, function (err, row) {
        expect(err).toBeNull();
        expect(row).toBe(true);

        // TEST 2: Check if non-existent user exists in database
        checkUserExists(invalidEmail, function (err, row) {
            expect(err).toBeNull();
            expect(row).toBe(false);
            done();
        })
    });
});

// Test deleteJournalEntry function
test('createUserAfterSpotifyAuthh creates new user if spotify profile does not exist in database', function (done) {
    // spotify profile already existent in database
    const spotifyProfile1 = {
        id: 'testUser2',
        email: 'testuser2@example.com',
        display_name: 'Test User 2'
    }

    // new spotify profile non-existent in database 
    const spotifyProfileBatman = {
        id: 'iambatman',
        email: 'batman@iambatman.com',
        display_name: 'BATMAN'
    }

    // check count of users before for baseline
    db.get(`SELECT COUNT(userID) AS userCount FROM users`, [], function (err, countResult) {
        expect(err).toBeNull();
        expect(countResult.userCount).toBe(2);

        // TEST 1: Create user on a spotify profile already existent in database
        createUserAfterSpotifyAuth(spotifyProfile1, function (err, spotifyProfile) {
            expect(err).toBeNull();

            // check count of users does not change after
            db.get(`SELECT COUNT(userID) AS userCount FROM users`, [], function (err, countResult) {
                expect(err).toBeNull();
                expect(countResult.userCount).toBe(2);

                // TEST 2: Create user on a spotify profile non-existent in database
                createUserAfterSpotifyAuth(spotifyProfileBatman, function (err, spotifyProfile) {
                    expect(err).toBeNull();
                    expect(spotifyProfile).toBe(spotifyProfileBatman);

                    // check count of users does not change after
                    db.get(`SELECT COUNT(userID) AS userCount FROM users`, [], function (err, countResult) {
                        expect(err).toBeNull();
                        expect(countResult.userCount).toBe(3);
                        done();
                    });
                });
            });
        });
    });
});