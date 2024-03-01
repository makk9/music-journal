const { v4: uuidv4 } = require('uuid');

// Generates a random string across the alphabet(lowercase & uppercase) and figits
function generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// Generates universally unique identifier that is highly unlikely to collide
function generateUniqueID() {
    return uuidv4(); // Generates a unique UUID
};

module.exports = { generateRandomString, generateUniqueID };
