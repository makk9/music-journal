const express = require("express")
const axios = require('axios');
const authRouter = express.Router();

const { generateRandomString } = require('../../utils/utilityFunctions');
const db = require('../../database/database.js');
const dotenv = require('dotenv');

var access_token = ''
dotenv.config()

var spotify_client_id = process.env.SPOTIFY_CLIENT_ID
var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET
var spotify_redirect_uri = "http://localhost:3000/auth/callback"


/**
 * Endpoint to initiate the Spotify OAuth authentication flow.
 * It constructs the URL for Spotify's authorization request and
 * redirects the client to Spotify's OAuth login page.
 */
authRouter.get('/auth/login', function (req, res) {

    var scope = "streaming user-read-email user-read-private"
    var state = generateRandomString(16);

    // constructs query parameters for Spotify authorization request
    var auth_query_parameters = new URLSearchParams({
        response_type: "code",
        client_id: spotify_client_id,
        scope: scope,
        redirect_uri: spotify_redirect_uri,
        state: state
    })

    res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
})

/**
 * Endpoint for Spotify's OAuth 2.0 flow.
 * Called after the user has authorized the application on Spotify's authorization page.
 * It exchanges the authorization code received with Spotify for an access token,
 * fetches the user's profile using the access token, creates or updates the user in the local database,
 * and then redirects the user to the home page of the application.
 */
authRouter.get('/auth/callback', function (req, res) {
    var code = req.query.code;

    // configuration for POST request to Spotify's api/token endpoint -- exchanges authorization code for access token
    var authOptions = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        // payload of request
        data: new URLSearchParams({
            code: code,
            redirect_uri: spotify_redirect_uri,
            grant_type: 'authorization_code'
        }).toString(),
        headers: {
            // Encode client ID and secret in the headers.
            'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    // Make the HTTP request to Spotify's token endpoint to exchange the code for an access token.
    axios(authOptions)
        //handles successful response(authorization code exchanged for access token)
        .then(response => {
            if (response.status === 200) {
                access_token = response.data.access_token;

                // Fetch user profile from Spotify using access_token
                return axios.get('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': `Bearer ${access_token}` }
                });
            } else {
                throw new Error('Failed to obtain access token');
            }
        }).then(response => {
            // With Spotify profile fetched, call function to create the user
            const spotifyProfile = response.data;
            return db.createUserAfterSpotifyAuth(spotifyProfile, function (err, result) {
                if (err) {
                    console.error('Failed to create user after Spotify auth:', err);
                } else {
                    console.log('User created or updated successfully');
                }
            });
        }).then(() => {
            // Setting access_token to HttpOnly Cookie
            res.cookie('accessToken', access_token, { httpOnly: true, secure: true, sameSite: 'Strict' });
            // Redirect or handle the authenticated user in your app
            res.redirect('/');
        }).catch(error => {
            console.error('Error during authentication:', error);
            res.status(500).send('Authentication error');
        });
});

// Endpoint fetches access token
authRouter.get('/auth/token', function (req, res) {
    res.json(
        {
            access_token: access_token
        })
});

module.exports = authRouter;
