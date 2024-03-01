const express = require('express');
const trackRouter = express.Router();

const { authenticateUser } = require('../middlewares/authenticateUser.js');
const db = require('../../database/database.js');
const { generateUniqueID } = require('../utils/utilityFunctions');

// Endpoint adds track that has been posted from client to database
trackRouter.post('/track', authenticateUser, function (req, res) {
    console.log("TRACK ENDPOINT");
    const { spotifyTrackID, title, artist, album } = req.body;
    const trackID = generateUniqueID();

    // Insert new track into the database
    db.addTrack({
        trackID,
        spotifyTrackID,
        title,
        artist,
        album
    }, function (err) {
        if (err) {
            console.error('Failed to add track:', err);
            res.status(500).send('Failed to add track');
        } else {
            res.status(201).send('Track added');
        }
    });
});

module.exports = trackRouter;
