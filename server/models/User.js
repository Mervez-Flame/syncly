
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleID: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: String,
    avatar: String,
    googleRefreshToken: { type: String, required: true }, // Encrypted with AES-256
    
    // Set to true when Google rejects the stored refresh token (revoked or expired). The app should then ask the user to sign in with Google again.
    needsReauth: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//     googleID: { type: String, required: true, unique: true },
//     email: { type: String, required: true, unique: true },
//     name: String,
//     avatar: String,
//     googleRefreshToken: { type: String, required: true }, // Encrypted with AES-256
// }, { timestamps: true });

// module.exports = mongoose.model('User', UserSchema);