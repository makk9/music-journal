const sqlite3 = require('sqlite3').verbose();
const { encrypt, decrypt } = require('../utils/encryption');


const dbFile = process.env.NODE_ENV === 'test' ? ':memory:' : './musicjournalApp.db';
const encryptionKey = process.env.ENCRYPTION_KEY;

// Open a database connection and initialize file based on test environment or not
let db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE | (dbFile === ':memory:' ? sqlite3.OPEN_CREATE : 0), function (err) {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the SQLite database.');
        if (dbFile === ':memory:') {
            console.log('Using in-memory database for testing.');
        }
        // Enable foreign key support
        db.run("PRAGMA foreign_keys = ON;", (err) => {
            if (err) {
                console.error("Error enabling foreign key support:", err.message);
            } else {
                console.log("Foreign key support enabled.");
            }
        });
    }
});

/**
 * Adds a new user to the database.
 * @param {Object} user - The user object to add.
 * @param {Function} callback - A callback function to be called with the results.
 */
function addUser(user, callback) {
    const { userID, username, email } = user;
    const sql = `INSERT INTO users (userID, username, email) VALUES (?, ?, ?)`;

    db.run(sql, [userID, username, email], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            console.log('A new user has been added with ID:', userID);
            callback(null, userID);
        }
    });
};

/**
 * Get user by Spotify ID.
 * @param {string} userID - The spotify ID of the user for which to retrieve.
 * @param {Function} callback - A callback function to be called with the results.
 */
function getUserBySpotifyID(userID, callback) {
    const sql = `SELECT * FROM users WHERE userID = ?`;

    db.all(sql, [userID], function (err, row) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            console.log('User has been retrieved with spotify ID:', userID);
            callback(null, row[0]);
        }
    });
}

/**
 * Adds a new track to the database.
 * @param {Object} track - The track object to add.
 * @param {Function} callback - A callback function to be called with the results.
 */
function addTrack(track, callback) {
    const { spotifyTrackID, trackTitle, artist, album } = track;
    const sql = `INSERT OR IGNORE INTO tracks (spotifyTrackID, trackTitle, artist, album) VALUES (?, ?, ?, ?)`;

    db.run(sql, [spotifyTrackID, trackTitle, artist, album], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            console.log('A new track has been added or ignored if already exists, with ID:', spotifyTrackID);
            callback(null, spotifyTrackID);
        }
    });
};

/**
 * Adds a new journal entry to the database.
 * @param {Object} entry - The journal entry object to add.
 * @param {Function} callback - A callback function to be called with the results.
 */
function addJournalEntry(entry, callback) {
    const { entryID, userID, trackID, journalCover, entryTitle, entryText, imageURL, createdAt, updatedAt } = entry;

    // Encrypt the journal contents
    const encryptedJournalCover = encrypt(journalCover, encryptionKey);
    const encryptedEntryTitle = encrypt(entryTitle, encryptionKey);
    const encryptedEntryText = encrypt(entryText, encryptionKey);
    const encryptedImageURL = encrypt(imageURL, encryptionKey);

    const sql = `INSERT INTO journal_entries (entryID, userID, trackID, journalCover, entryTitle, entryText, imageURL, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [entryID, userID, trackID, encryptedJournalCover, encryptedEntryTitle, encryptedEntryText, encryptedImageURL, createdAt, updatedAt], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null); // communicate to caller of failure of operation
        } else {
            console.log('A journal entry has been added with ID:', entryID);
            callback(null, entryID);
        }
    });
};

/**
 * Retrieves journal entries for a specific track ID and userID.
 * @param {string} trackID - The ID of the track for which to retrieve journal entries.
 * @param {string} userID - The ID of the user for which to retrieve journal entries.
 * @param {Function} callback - A callback function to be called with the results.
 */
function getJournalEntriesByTrackID(trackID, userID, callback) {
    const sql = `SELECT * FROM journal_entries WHERE trackID = ? AND userID = ?`;

    db.all(sql, [trackID, userID], function (err, rows) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            // Decrypt entryText and imageURL for each journal entry
            const decryptedRows = rows.map(row => {
                return {
                    ...row,
                    journalCover: decrypt(row.journalCover, encryptionKey),
                    entryTitle: decrypt(row.entryTitle, encryptionKey),
                    entryText: decrypt(row.entryText, encryptionKey),
                    imageURL: row.imageURL ? decrypt(row.imageURL, encryptionKey) : null // Check if imageURL exists before decrypting
                };
            });
            console.log('Journal Entries have been retrieved with track ID:', trackID);
            callback(null, decryptedRows);
        }
    });
};

/**
 * Retrieves all journal entries associated with user..
 * @param {string} userID - The ID of the user for which to retrieve journal entries.
 * @param {Function} callback - A callback function to be called with the results.
 */
function getAllUserJournalEntries(userID, callback) {
    const sql = `SELECT * FROM journal_entries WHERE userID = ?`;

    db.all(sql, [userID], function (err, rows) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            // Decrypt journal entry data
            const decryptedRows = rows.map(row => {
                return {
                    ...row,
                    journalCover: decrypt(row.journalCover, encryptionKey),
                    entryTitle: decrypt(row.entryTitle, encryptionKey),
                    entryText: decrypt(row.entryText, encryptionKey),
                    imageURL: row.imageURL ? decrypt(row.imageURL, encryptionKey) : null // Check if imageURL exists before decrypting
                };
            });
            console.log('Journal Entries have been retrieved with user ID:', userID);
            callback(null, decryptedRows);
        }
    });
};

/**
 * Update an existing journal entry.
 * @param {string} entryID - The ID of the journal entry to update.
 * @param {Object} data - An object containing the fields to update.
 * @param {function} callback - A callback function that is called after the update operation is completed.
 */
function updateJournalEntry(entryID, userID, data, callback) {
    //const { entryText, imageURL, updatedAt } = data;
    let fieldsToUpdate = [];
    let sqlValues = [];

    // Encrypt the entryText and imageURL

    // check which updatable fields provided and need updating
    if (data.journalCover !== undefined) {
        fieldsToUpdate.push("journalCover = ?");
        // encrypt journalCover data
        const encryptedJournalCover = encrypt(data.journalCover, encryptionKey);
        sqlValues.push(encryptedJournalCover);
    }
    if (data.entryTitle !== undefined) {
        fieldsToUpdate.push("entryTitle = ?");
        // encrypt entryTitle data
        const encryptedEntryTitle = encrypt(data.entryTitle, encryptionKey);
        sqlValues.push(encryptedEntryTitle);
    }
    if (data.entryText !== undefined) {
        fieldsToUpdate.push("entryText = ?");
        // encrypt entryText data
        const encryptedEntryText = encrypt(data.entryText, encryptionKey);
        sqlValues.push(encryptedEntryText);
    }
    if (data.imageURL !== undefined) {
        fieldsToUpdate.push("imageURL = ?");
        // encrypt imageURL data
        const encryptedImageURL = encrypt(data.imageURL, encryptionKey);
        sqlValues.push(encryptedImageURL);
    }

    fieldsToUpdate.push("updatedAt = ?");
    sqlValues.push(data.updatedAt);

    sqlValues.push(entryID, userID);

    const sql = `
        UPDATE journal_entries
        SET ${fieldsToUpdate.join(", ")}
        WHERE entryID = ? AND userID = ?`;

    db.run(sql, sqlValues, function (err) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null); // Communicate to the caller the failure of the operation
        } else {
            console.log(`A journal entry has been updated with ID: ${entryID}`);
            // this.changes is a property of the context object in sqlite3's run method callback
            // It tells you how many rows were affected by the operation
            if (this.changes > 0) {
                callback(null, entryID); // Successfully updated an entry, communicate success
            } else {
                console.log('No journal entry found with that ID.');
                callback(new Error('No journal entry found with that ID.')); // No entry found to update
            }
        }
    });
};

/**
 * Delete an existing journal entry based on entryID. 
 * @param {string} entryID - The ID of the journal entry to update.
 * @param {function} callback - A callback function that is called after the update operation is completed.
 */
function deleteJournalEntry(entryID, userID, callback) {
    const sql = 'DELETE FROM journal_entries WHERE entryID = ? AND userID = ?';

    db.run(sql, [entryID, userID], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            console.log(`A journal entry has been deleted with ID: ${entryID}`);
            if (this.changes > 0) {
                callback(null, null);
            } else {
                console.log('No journal entry found with that ID.');
                callback(new Error('No journal entry found with that ID.'));
            }
        }
    });
}

/**
 * Checks if user exists by searching for email associated with user in database. 
 * @param {string} email - The email of user to check against.
 * @param {function} callback - A callback function that is called after the update operation is completed.
 */
function checkUserExists(email, callback) {
    const sql = `SELECT * FROM users WHERE email = ?`;

    db.get(sql, [email], function (err, row) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            console.log(`A user has been looked up with email: ${email}`);
            callback(null, row ? true : false);
        }
    });
};

/**
 * Checks if user, identified by their Spotify email, already exists in the database.
 * If the user does not exist, creates a new user entry using details from the Spotify profile.
 * @param {Object} spotifyProfile - The user's profile information from Spotify.
 * @param {function} callback - A callback function that is called after the update operation is completed.
 */
async function createUserAfterSpotifyAuth(spotifyProfile, callback) {
    const { id: spotifyUserID, email, display_name: username } = spotifyProfile;

    // Check if user exists
    checkUserExists(email, function (err, exists) {
        if (err) {
            console.error('Database error:', err);
            callback(err, null);
            return;
        }

        if (!exists) {
            // User does not exist, add them
            addUser({
                userID: spotifyUserID, // Using Spotify's user ID as userID in User database
                email: email,
                username: username
            }, function (err) {
                if (err) {
                    console.error('Failed to add user:', err);
                    callback(err, null);
                } else {
                    console.log('User added successfully');
                    callback(null, spotifyProfile);
                }
            });
        } else {
            console.log('User already exists in the database.');
            callback(null, spotifyProfile);
        }
    });
}

// Closes database connection
function closeDb() {
    db.close(function (err) {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
    });
};

// // Example: Adding a user, a track, and journal entry
// addUser({
//     userID: 'user123',
//     username: 'musiclover',
//     email: 'user@example.com'
// });

// addTrack({
//     trackID: 'track456',
//     spotifyTrackID: 'spotify:track:123abc',
//     title: 'Song Name',
//     artist: 'Artist Name',
//     album: 'Album Name'
// });

// addJournalEntry({
//     entryID: 'entry789',
//     userID: 'user123',
//     trackID: 'track456',
//     entryText: 'This song reminds me of summer...',
//     imageURL: 'http://path.to/image.jpg',
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString()
// }, closeDb); // Pass the closeDb function as a callback



// Exports the functions for use in other parts of the application
module.exports = {
    db,
    addUser,
    getUserBySpotifyID,
    addTrack,
    addJournalEntry,
    getJournalEntriesByTrackID,
    getAllUserJournalEntries,
    updateJournalEntry,
    deleteJournalEntry,
    checkUserExists,
    createUserAfterSpotifyAuth,
    closeDb,
};
