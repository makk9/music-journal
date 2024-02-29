const express = require("express")
const backgroundRouter = express.Router();

const { authenticateUser } = require('../middlewares/authenticateUser');
const Vibrant = require('node-vibrant');


// TODO: If we can find a way to sort of crop album art as to only look at center art and base background color off that, it could look better.
// Reason being is that a contrast of the background with the edges of album art makes art pop out more and looks better I think. Just conjecture.
// Also could be cool to have the option to set your own background and somehow merge album art background with it.
// Could also be cool if you can find color that "pops" out the most in an album that's not within the defined borders of album art.
// Also, if we could somehow ignore the skin color of any human on the cover why extracting theme color could be ideal. 

// Endpoint to dynamically set backgroudn color of application based on primary color extracted from album art.

backgroundRouter.get('/background', authenticateUser, async function (req, res) {
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

module.exports = backgroundRouter;