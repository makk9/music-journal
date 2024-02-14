const sqlite3 = require('sqlite3').verbose();

// Open a database connection
let db = new sqlite3.Database('./musicjournalApp.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the journalApp.db SQLite database.');
});

// Function to add a user
const addUser = (user) => {
    const { userID, username, email } = user;
    const sql = `INSERT INTO users (userID, username, email) VALUES (?, ?, ?)`;

    db.run(sql, [userID, username, email], (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('A new user has been added');
    });
};

// Function to add a track
const addTrack = (track) => {
    const { trackID, spotifyTrackID, title, artist, album } = track;
    const sql = `INSERT INTO tracks (trackID, spotifyTrackID, title, artist, album) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [trackID, spotifyTrackID, title, artist, album], (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('A new track has been added');
    });
};

/**
 * Adds a new journal entry to the database.
 * @param {Object} entry - The journal entry object to add.
 */
const addJournalEntry = (entry) => {
    const { entryID, userID, trackID, entryText, imageURL, createdAt, updatedAt } = entry;
    const sql = `INSERT INTO journal_entries (entryID, userID, trackID, entryText, imageURL, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [entryID, userID, trackID, entryText, imageURL, createdAt, updatedAt], (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('A journal entry has been added');
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

// Example: Adding a user, a track, and journal entry
addUser({
    userID: 'user123',
    username: 'musiclover',
    email: 'user@example.com'
});

addTrack({
    trackID: 'track456',
    spotifyTrackID: 'spotify:track:123abc',
    title: 'Song Name',
    artist: 'Artist Name',
    album: 'Album Name'
});

addJournalEntry({
    entryID: 'entry789',
    userID: 'user123',
    trackID: 'track456',
    entryText: 'This song reminds me of summer...',
    imageURL: 'http://path.to/image.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
}, closeDb); // Pass the closeDb function as a callback



// Export the functions for use in other parts of the application
module.exports = {
    addJournalEntry,
    closeDb,
};
