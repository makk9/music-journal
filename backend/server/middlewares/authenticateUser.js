const axios = require('axios');
const db = require('../../database/database.js');

/**
 * Fetches the Spotify user profile using the access token.
 * @param {string} accessToken The Spotify access token.
 * @return {Promise<Object|null>} The user profile object or null if the request fails.
 */
async function fetchSpotifyUserProfile(accessToken) {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data; // The user profile data from Spotify
    } catch (error) {
        console.error('Error fetching Spotify user profile:', error);
        return null;
    }
};

/**
 * Middleware function to authenticate the user for each request.
 * It extracts the access token from the Authorization header, validates it with Spotify,
 * fetches the user's profile, checks if the user exists in the local database,
 * and attaches the user object to the request for downstream use.
 * 
 * @param {Object} req - The request object from the client.
 * @param {Object} res - The response object to the client.
 * @param {Function} next - The next middleware function in the stack.
 */
async function authenticateUser(req, res, next) {

    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
        return res.status(401).send('Access token required');
    }

    try {
        // Validate access token with Spotify and fetch user profile
        const userProfile = await fetchSpotifyUserProfile(accessToken);
        if (!userProfile) {
            return res.status(401).send('Invalid access token');
        }

        const user = await new Promise(function (resolve, reject) {
            db.getUserBySpotifyID(userProfile.id, function (err, row) {
                if (err) {
                    console.error('Failed to retrieve user:', err);
                    reject(new Error('Failed to retrieve user'));
                } else if (row) {
                    resolve(row);
                } else {
                    reject(new Error('User not found'));
                }
            });
        });

        // Attach user to the request for downstream use
        req.user = user;
        next();
    } catch (error) {
        console.log("ERROR: " + error);
        console.error('Authentication error:', error);
        if (error.message === 'User not found') {
            res.status(404).send('User not found');
        } else {
            res.status(500).send('Internal server error');
        }
    }
};

module.exports = { authenticateUser, fetchSpotifyUserProfile, };