const express = require("express")
const backgroundRouter = express.Router();

const { authenticateUser } = require('../middlewares/authenticateUser');
const Vibrant = require('node-vibrant');

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