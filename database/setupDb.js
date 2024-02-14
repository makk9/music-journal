const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./musicjournalApp.db');

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
    userID TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  );`);

    // Tracks Table
    db.run(`CREATE TABLE IF NOT EXISTS tracks (
    trackID TEXT PRIMARY KEY,
    spotifyTrackID TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT NOT NULL
  );`);

    // Journal Entries Table
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
  );`);
});

db.close();
