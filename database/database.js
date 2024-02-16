const sqlite3 = require('sqlite3').verbose();

// Open a database connection
let db = new sqlite3.Database('./musicjournalApp.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the journalApp.db SQLite database.');
});

/**
 * Adds a new user to the database.
 * @param {Object} user - The user object to add.
 * @param {Function} callback - A callback function to be called with the results.
 */
function addUser(user, callback) {
    const { userID, username, email } = user;
    const sql = `INSERT INTO users (userID, username, email) VALUES (?, ?, ?)`;

    db.run(sql, [userID, username, email], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            callback(err);
        } else {
            console.log('A new user has been added with ID:', userID);
            callback(null, userID);
        }
    });
};

/**
 * Adds a new track to the database.
 * @param {Object} track - The track object to add.
 * @param {Function} callback - A callback function to be called with the results.
 */
function addTrack(track, callback) {
    const { trackID, spotifyTrackID, title, artist, album } = track;
    const sql = `INSERT INTO tracks (trackID, spotifyTrackID, title, artist, album) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [trackID, spotifyTrackID, title, artist, album], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            callback(err);
        } else {
            console.log('A new track has been added with ID:', trackID);
            callback(null, trackID);
        }
    });
};

/**
 * Adds a new journal entry to the database.
 * @param {Object} entry - The journal entry object to add.
 * @param {Function} callback - A callback function to be called with the results.
 */
function addJournalEntry(entry, callback) {
    const { entryID, userID, trackID, entryText, imageURL, createdAt, updatedAt } = entry;
    const sql = `INSERT INTO journal_entries (entryID, userID, trackID, entryText, imageURL, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [entryID, userID, trackID, entryText, imageURL, createdAt, updatedAt], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            callback(err); // communicate to caller of failure of operation
        } else {
            console.log('A journal entry has been added with ID:', entryID);
            callback(null, entryID);
        }
    });
};

/**
 * Retrieves journal entries for a specific track ID and userID.
 * @param {string} trackID - The ID of the track for which to retrieve journal entries.
 * @param {Function} callback - A callback function to be called with the results.
 */
function getJournalEntriesByTrackID(trackID, userID, callback) {
    const sql = `SELECT * FROM journal_entries WHERE trackID = ? AND userID = ?`;

    db.all(sql, [trackID, userID], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            console.log('Journal Entries have been retrieved with track ID:', trackID);
            callback(null, rows);
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
    const { entryText, imageURL, updatedAt } = data;
    const sql = `
        UPDATE journal_entries
        SET entryText = ?,
            imageURL = ?,
            updatedAt = ?
        WHERE entryID = ? AND userID = ?`;

    db.run(sql, [entryText, imageURL, updatedAt, entryID, userID], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            callback(err); // Communicate to the caller the failure of the operation
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

    db.run(sql, [entryID, userID], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            callback(err);
        } else {
            console.log(`A journal entry has been deleted with ID: ${entryID}`);
            if (this.changes > 0) {
                callback(null);
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

    db.get(sql, [email], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else {
            console.log(`A user has been looked up with email: ${email}`);
            callback(null, row ? true : false);
        }
    });
};

// Closes database connection
const closeDb = () => {
    db.close((err) => {
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
    addUser,
    addTrack,
    addJournalEntry,
    getJournalEntriesByTrackID,
    updateJournalEntry,
    deleteJournalEntry,
    checkUserExists,
    closeDb,
};
