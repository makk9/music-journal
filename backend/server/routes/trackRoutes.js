const express = require('express');
const trackRouter = express.Router();

const { authenticateUser } = require('../middlewares/authenticateUser.js');
const db = require('../../database/database.js');
const { generateUniqueID } = require('../../utils/utilityFunctions');

// Endpoint adds track that has been posted from client to database
trackRouter.post('/track', authenticateUser, function (req, res) {
    console.log("TRACK ENDPOINT");
    const { spotifyTrackID, trackTitle, artist, album, uri } = req.body;

    // Insert new track into the database
    db.addTrack({
        spotifyTrackID,
        trackTitle,
        artist,
        album,
        uri
    }, function (err) {
        if (err) {
            console.error('Failed to add track:', err);
            res.status(500).send('Failed to add track');
        } else {
            res.status(201).send('Track added');
        }
    });
});

// Endpoint to get journal entries for specific track ID from database
trackRouter.get('/track/:trackId', authenticateUser, function (req, res) {
    console.log("GET TRACK ENDPOINT");
    const { trackId } = req.params;

    db.getTrackbyTrackID(trackId, function (err, track) {
        if (err) {
            console.error('Failed to retrieve track:', err);
            res.status(500).send('Failed to retrieve track');
        } else {
            res.json(track);
        }
    });
});

module.exports = trackRouter;
