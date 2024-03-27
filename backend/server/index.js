const express = require("express")
const dotenv = require("dotenv")
const path = require('path');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const backgroundRoutes = require('./routes/backgroundRoutes');
const trackRoutes = require('./routes/trackRoutes');
const journalRoutes = require('./routes/journalRoutes');
const playerRoutes = require('./routes/playerRoutes');



dotenv.config();
const app = express();
const port = 5000;

app.use(express.json());
app.use(cookieParser()); // Enable cookie parsing to read our access_token stored in a HttpOnly cookie

// Use routes
app.use(authRoutes);
app.use(backgroundRoutes);
app.use(trackRoutes);
app.use(journalRoutes);
app.use(playerRoutes);

// Only start the server if this file is run directly
if (require.main === module) {
    app.listen(port, function () {
        console.log(`Listening at http://localhost:${port}`);
    });
}

app.use(express.static(path.join(__dirname, 'build')));

module.exports = app;