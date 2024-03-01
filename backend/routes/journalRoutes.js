const express = require('express');
const journalRouter = express.Router();

const { authenticateUser } = require('../middlewares/authenticateUser.js');
const db = require('../../database/database.js');
const { generateUniqueID } = require('../utils/utilityFunctions');

// Endpoint handles adding new journal entry that has been posted from client to database
journalRouter.post('/journal', authenticateUser, function (req, res) {
    console.log("JOURNAL ENDPOINT");
    // Extract journal entry details from request body
    const { userID, trackID, entryText, imageURL } = req.body;

    // Generate a unique entryID and timestamps
    const entryID = generateUniqueID();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // Insert the new journal entry into the database
    db.addJournalEntry({
        entryID,
        userID,
        trackID,
        entryText,
        imageURL,
        createdAt,
        updatedAt
    }, function (err) {
        if (err) {
            console.error('Failed to add journal entry:', err);
            res.status(500).send('Failed to add journal entry');
        } else {
            res.status(201).send('Journal entry added');
        }
    });
});

// Endpoint to get journal entries for specific track ID from database
journalRouter.get('/journal/:trackId', authenticateUser, function (req, res) {
    console.log("GET JOURNAL ENDPOINT");
    const { trackId } = req.params;
    const userID = req.user.userID; // get user ID that is attached to req from authenticateUser

    db.getJournalEntriesByTrackID(trackId, userID, function (err, entries) {
        if (err) {
            console.error('Failed to retrieve journal entries:', err);
            res.status(500).send('Failed to retrieve journal entries');
        } else {
            res.json(entries);
        }
    });
});

// Endpoint to update existing journal entry from database
journalRouter.put('/journal/:entryId', authenticateUser, function (req, res) {
    console.log("UPDATE ENTRY ENDPOINT");
    const { entryId } = req.params;
    const { entryText, imageURL } = req.body;
    const updatedAt = new Date().toISOString();

    const userID = req.user.userID;

    db.updateJournalEntry(entryId, userID, { entryText, imageURL, updatedAt }, function (err) {
        if (err) {
            console.error('Failed to update journal entry:', err);
            res.status(500).send('Failed to update journal entry');
        } else {
            res.send('Journal entry updated');
        }
    });
});

// Endpoint to delete existing journal entry based on entryID from database
journalRouter.delete('/journal/:entryId', authenticateUser, function (req, res) {
    console.log("DELETE ENDPOINT");
    const { entryId } = req.params;
    const userID = req.user.userID;

    db.deleteJournalEntry(entryId, userID, function (err) {
        if (err) {
            console.error('Failed to delete journal entry:', err);
            res.status(500).send('Failed to delete journal entry');
        } else {
            res.send('Journal entry deleted');
        }
    });
});

module.exports = journalRouter;
