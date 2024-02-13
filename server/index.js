const express = require("express")
const axios = require('axios');
const dotenv = require("dotenv")
const path = require('path');
const Vibrant = require('node-vibrant');

const port = 5000
var access_token = ''
dotenv.config()

var spotify_client_id = process.env.SPOTIFY_CLIENT_ID
var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET
var spotify_redirect_uri = "http://localhost:3000/auth/callback"

var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var app = express();

// endpoint that initiates OAuth authentication flow with Spotify
app.get('/auth/login', (req, res) => {

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

// endpoint that handles callback/OAuth 2.0 flow with Spotify -- exchange of authorization code for access token after user has attempted to log in/authorize
app.get('/auth/callback', (req, res) => {
    // 
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
            'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    // makes HTTP request to Spotify's token endpoint
    // axios returns promise that resolves with response from Spotify
    axios(authOptions)
        //handles successful response(authorization code exchanged for access token)
        .then(response => {
            if (response.status === 200) {
                access_token = response.data.access_token;
                res.redirect('/');
            }
        })
        .catch(error => {
            console.error('Error during authentication:', error);
            res.status(500).send('Authentication error');
        });
});

// endpoint that fetches access token
app.get('/auth/token', (req, res) => {
    res.json(
        {
            access_token: access_token
        })
});

// TODO: If we can find a way to sort of crop album art as to only look at center art and base background color off that, it could look better.
// Reason being is that a contrast of the background with the edges of album art makes art pop out more and looks better I think. Just conjecture.
// Also could be cool to have the option to set your own background and somehow merge album art background with it.
// Could also be cool if you can find color that "pops" out the most in an album that's not within the defined borders of album art.
app.get('/image-color', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).send('No image URL provided');
    }

    try {
        // Use node-vibrant to extract the palette
        const palette = await Vibrant.from(imageUrl).getPalette();
        // Get the Vibrant swatch, as an example of primary color
        const vibrant = palette.DarkVibrant;

        if (vibrant) {
            const primaryColor = {
                r: vibrant.rgb[0],
                g: vibrant.rgb[1],
                b: vibrant.rgb[2],
            };

            res.json(primaryColor);
        } else {
            res.status(404).send('Primary color not found');
        }
    } catch (error) {
        console.error('Failed to process image', error);
        res.status(500).send('Failed to process image');
    }
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})

// enables server to serve React application's static files 
// useful for production environment where server and frontend can be on same domain and port
app.use(express.static(path.join(__dirname, 'build')));