const axios = require('axios');
const express = require('express');
const playerRouter = express.Router();

const { authenticateUser } = require('../middlewares/authenticateUser.js');

// Endpoint to play specified track
playerRouter.put('/play', authenticateUser, async (req, res) => {
    const { trackUri } = req.body;
    const accessToken = req.cookies.accessToken;

    try {
        const response = await axios.put('https://api.spotify.com/v1/me/player/play', {
            uris: [trackUri]
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 204) { // Spotify API returns 204 NO CONTENT on success for this call
            res.status(200).send('Track playing');
        } else {
            // Handle unexpected Spotify API response
            res.status(response.status).send('Failed to play track');
        }
    } catch (error) {
        console.error('Error playing track:', error);
        if (error.response) {
            // If Spotify API returned an error, forward that error status and message
            res.status(error.response.status).send(error.response.data);
        } else {
            // For network errors or other axios issues
            res.status(500).send('Error playing track');
        }
    }
});

module.exports = playerRouter;