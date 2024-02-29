const express = require("express")
//const axios = require('axios');
const dotenv = require("dotenv")
const path = require('path');
// const Vibrant = require('node-vibrant');
// const db = require('../database/database.js');
// const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const backgroundRoutes = require('./routes/backgroundRoutes');
const trackRoutes = require('./routes/trackRoutes');
const journalRoutes = require('./routes/journalRoutes');



dotenv.config();
//var app = express();
const app = express();
const port = 5000;
// var access_token = ''

app.use(express.json());
app.use(cookieParser()); // Enable cookie parsing to read our access_token stored in a HttpOnly cookie

// Use routes
app.use(authRoutes);
app.use(backgroundRoutes);
app.use(trackRoutes);
app.use(journalRoutes);

// Only start the server if this file is run directly
if (require.main === module) {
    app.listen(port, function () {
        console.log(`Listening at http://localhost:${port}`);
    });
}

app.use(express.static(path.join(__dirname, 'build')));


module.exports = app;

// var spotify_client_id = process.env.SPOTIFY_CLIENT_ID
// var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET
// var spotify_redirect_uri = "http://localhost:3000/auth/callback"

// /** TODO:
//  * Everytime we run a request to the database, we are authenticating the user and while doing so calling a HTTP request to get the user profile
//  * -- is it better to somehow cache the userprofile we've fetched and juts used that? But has to be done in a very safe/secure way.
//  *
//  * Need to make function styles consistent(async function() vs. () =>)
//  */

// // Generates a random string across the alphabet(lowercase & uppercase) and figits
// function generateRandomString(length) {
//     var text = '';
//     var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

//     for (var i = 0; i < length; i++) {
//         text += possible.charAt(Math.floor(Math.random() * possible.length));
//     }
//     return text;
// };

// // Generates universally unique identifier that is highly unlikely to collide
// function generateUniqueID() {
//     return uuidv4(); // Generates a unique UUID
// };

// /**
//  * Fetches the Spotify user profile using the access token.
//  * @param {string} accessToken The Spotify access token.
//  * @return {Promise<Object|null>} The user profile object or null if the request fails.
//  */
// async function fetchSpotifyUserProfile(accessToken) {
//     console.log("FETCHHHH");
//     try {
//         const response = await axios.get('https://api.spotify.com/v1/me', {
//             headers: {
//                 'Authorization': `Bearer ${accessToken}`
//             }
//         });
//         return response.data; // The user profile data from Spotify
//     } catch (error) {
//         console.error('Error fetching Spotify user profile:', error);
//         return null;
//     }
// };

// /**
//  * Middleware function to authenticate the user for each request.
//  * It extracts the access token from the Authorization header, validates it with Spotify,
//  * fetches the user's profile, checks if the user exists in the local database,
//  * and attaches the user object to the request for downstream use.
//  *
//  * @param {Object} req - The request object from the client.
//  * @param {Object} res - The response object to the client.
//  * @param {Function} next - The next middleware function in the stack.
//  */
// async function authenticateUser(req, res, next) {
//     //const accessToken = req.headers.authorization?.split(' ')[1];

//     const accessToken = req.cookies.accessToken;

//     if (!accessToken) {
//         return res.status(401).send('Access token required');
//     }

//     try {
//         // Validate access token with Spotify and fetch user profile
//         const userProfile = await fetchSpotifyUserProfile(accessToken);
//         if (!userProfile) {
//             //console.log("USER PROFILE HERE" + userProfile);
//             return res.status(401).send('Invalid access token');
//         }

//         const user = await new Promise(function (resolve, reject) {
//             //console.log("HELLOOOOOOOOOO");
//             db.getUserBySpotifyID(userProfile.id, function (err, row) {
//                 if (err) {
//                     console.error('Failed to retrieve user:', err);
//                     reject(new Error('Failed to retrieve user'));
//                 } else if (row) {
//                     resolve(row);
//                 } else {
//                     reject(new Error('User not found'));
//                 }
//             });
//         });

//         // Attach user to the request for downstream use
//         req.user = user;
//         next();
//     } catch (error) {
//         console.log("ERROR: " + error);
//         console.error('Authentication error:', error);
//         if (error.message === 'User not found') {
//             res.status(404).send('User not found');
//         } else {
//             res.status(500).send('Internal server error');
//         }
//     }
// };

// var app = express();
// app.use(cookieParser()); // Enable cookie parsing to read our access_token stored in a HttpOnly cookie

// /**
//  * Endpoint to initiate the Spotify OAuth authentication flow.
//  * It constructs the URL for Spotify's authorization request and
//  * redirects the client to Spotify's OAuth login page.
//  */
// app.get('/auth/login', function (req, res) {

//     var scope = "streaming user-read-email user-read-private"
//     var state = generateRandomString(16);

//     // constructs query parameters for Spotify authorization request
//     var auth_query_parameters = new URLSearchParams({
//         response_type: "code",
//         client_id: spotify_client_id,
//         scope: scope,
//         redirect_uri: spotify_redirect_uri,
//         state: state
//     })

//     res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
// })

// /**
//  * Endpoint for Spotify's OAuth 2.0 flow.
//  * Called after the user has authorized the application on Spotify's authorization page.
//  * It exchanges the authorization code received with Spotify for an access token,
//  * fetches the user's profile using the access token, creates or updates the user in the local database,
//  * and then redirects the user to the home page of the application.
//  */
// app.get('/auth/callback', function (req, res) {
//     var code = req.query.code;

//     // configuration for POST request to Spotify's api/token endpoint -- exchanges authorization code for access token
//     var authOptions = {
//         method: 'post',
//         url: 'https://accounts.spotify.com/api/token',
//         // payload of request
//         data: new URLSearchParams({
//             code: code,
//             redirect_uri: spotify_redirect_uri,
//             grant_type: 'authorization_code'
//         }).toString(),
//         headers: {
//             // Encode client ID and secret in the headers.
//             'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
//             'Content-Type': 'application/x-www-form-urlencoded'
//         }
//     };

//     // Make the HTTP request to Spotify's token endpoint to exchange the code for an access token.
//     axios(authOptions)
//         //handles successful response(authorization code exchanged for access token)
//         .then(response => {
//             if (response.status === 200) {
//                 access_token = response.data.access_token;

//                 // Fetch user profile from Spotify using access_token
//                 return axios.get('https://api.spotify.com/v1/me', {
//                     headers: { 'Authorization': `Bearer ${access_token}` }
//                 });
//             } else {
//                 throw new Error('Failed to obtain access token');
//             }
//         }).then(response => {
//             // With Spotify profile fetched, call function to create the user
//             const spotifyProfile = response.data;
//             return db.createUserAfterSpotifyAuth(spotifyProfile, function (err, result) {
//                 if (err) {
//                     console.error('Failed to create user after Spotify auth:', err);
//                 } else {
//                     console.log('User created or updated successfully');
//                 }
//             });
//         }).then(() => {
//             // Setting access_token to HttpOnly Cookie
//             res.cookie('accessToken', access_token, { httpOnly: true, secure: true, sameSite: 'Strict' });
//             // Redirect or handle the authenticated user in your app
//             res.redirect('/');
//         }).catch(error => {
//             console.error('Error during authentication:', error);
//             res.status(500).send('Authentication error');
//         });
// });

// // Endpoint fetches access token
// app.get('/auth/token', function (req, res) {
//     res.json(
//         {
//             access_token: access_token
//         })
// });

// // TODO: If we can find a way to sort of crop album art as to only look at center art and base background color off that, it could look better.
// // Reason being is that a contrast of the background with the edges of album art makes art pop out more and looks better I think. Just conjecture.
// // Also could be cool to have the option to set your own background and somehow merge album art background with it.
// // Could also be cool if you can find color that "pops" out the most in an album that's not within the defined borders of album art.
// // Also, if we could somehow ignore the skin color of any human on the cover why extracting theme color could be ideal.

// // Endpoint to dynamically set backgroudn color of application based on primary color extracted from album art.
// app.get('/image-color', authenticateUser, async function (req, res) {
//     const imageUrl = req.query.url;
//     if (!imageUrl) {
//         return res.status(400).send('No image URL provided');
//     }

//     try {
//         // Use node-vibrant to extract the palette
//         const palette = await Vibrant.from(imageUrl).getPalette();
//         // Get the Vibrant swatch, as an example of primary color
//         const vibrant = palette.DarkVibrant;

//         if (vibrant) {
//             const primaryColor = {
//                 r: vibrant.rgb[0],
//                 g: vibrant.rgb[1],
//                 b: vibrant.rgb[2],
//             };

//             res.json(primaryColor);
//         } else {
//             res.status(404).send('Primary color not found');
//         }
//     } catch (error) {
//         console.error('Failed to process image', error);
//         res.status(500).send('Failed to process image');
//     }
// });

// // endpoint adds user that has been posted from client to database
// app.post('/users', (req, res) => {
//     const { username, email } = req.body;
//     const userID = generateUniqueID(); // Create unique primary key

//     // Insert new user into the database
//     db.addUser({
//         userID,
//         username,
//         email
//     }, (err) => {
//         if (err) {
//             console.error('Failed to add user:', err);
//             res.status(500).send('Failed to add user');
//         } else {
//             res.status(201).send('User added');
//         }
//     });
// });

// Endpoint adds track that has been posted from client to database
// app.post('/track', authenticateUser, function (req, res) {
//     console.log("TRACK ENDPOINT");
//     const { spotifyTrackID, title, artist, album } = req.body;
//     const trackID = generateUniqueID();

//     // Insert new track into the database
//     db.addTrack({
//         trackID,
//         spotifyTrackID,
//         title,
//         artist,
//         album
//     }, function (err) {
//         if (err) {
//             console.error('Failed to add track:', err);
//             res.status(500).send('Failed to add track');
//         } else {
//             res.status(201).send('Track added');
//         }
//     });
// });


// // Endpoint handles adding new journal entry that has been posted from client to database
// app.post('/journal', authenticateUser, function (req, res) {
//     console.log("JOURNAL ENDPOINT");
//     // Extract journal entry details from request body
//     const { userID, trackID, entryText, imageURL } = req.body;

//     // Generate a unique entryID and timestamps
//     const entryID = generateUniqueID();
//     const createdAt = new Date().toISOString();
//     const updatedAt = createdAt;

//     // Insert the new journal entry into the database
//     db.addJournalEntry({
//         entryID,
//         userID,
//         trackID,
//         entryText,
//         imageURL,
//         createdAt,
//         updatedAt
//     }, function (err) {
//         if (err) {
//             console.error('Failed to add journal entry:', err);
//             res.status(500).send('Failed to add journal entry');
//         } else {
//             res.status(201).send('Journal entry added');
//         }
//     });
// });

// // Endpoint to get journal entries for specific track ID from database
// app.get('/journal/:trackId', authenticateUser, function (req, res) {
//     console.log("GET JOURNAL ENDPOINT");
//     const { trackId } = req.params;
//     const userID = req.user.userID; // get user ID that is attached to req from authenticateUser

//     db.getJournalEntriesByTrackID(trackId, userID, function (err, entries) {
//         if (err) {
//             console.error('Failed to retrieve journal entries:', err);
//             res.status(500).send('Failed to retrieve journal entries');
//         } else {
//             res.json(entries);
//         }
//     });
// });

// // Endpoint to update existing journal entry from database
// app.put('/journal/:entryId', authenticateUser, function (req, res) {
//     console.log("UPDATE ENTRY ENDPOINT");
//     const { entryId } = req.params;
//     const { entryText, imageURL } = req.body;
//     const updatedAt = new Date().toISOString();

//     const userID = req.user.userID;

//     db.updateJournalEntry(entryId, userID, { entryText, imageURL, updatedAt }, function (err) {
//         if (err) {
//             console.error('Failed to update journal entry:', err);
//             res.status(500).send('Failed to update journal entry');
//         } else {
//             res.send('Journal entry updated');
//         }
//     });
// });

// // Endpoint to delete existing journal entry based on entryID from database
// app.delete('/journal/:entryId', authenticateUser, function (req, res) {
//     console.log("DELETE ENDPOINT");
//     const { entryId } = req.params;
//     const userID = req.user.userID;

//     db.deleteJournalEntry(entryId, userID, function (err) {
//         if (err) {
//             console.error('Failed to delete journal entry:', err);
//             res.status(500).send('Failed to delete journal entry');
//         } else {
//             res.send('Journal entry deleted');
//         }
//     });
// });

// // Only start the server if this file is run directly
// if (require.main === module) {
//     app.listen(port, function () {
//         console.log(`Listening at http://localhost:${port}`);
//     });
// }

// enables server to serve React application's static files
// useful for production environment where server and frontend can be on same domain and port
// app.use(express.static(path.join(__dirname, 'build')));

//module.exports = { app, generateRandomString, fetchSpotifyUserProfile, authenticateUser };
