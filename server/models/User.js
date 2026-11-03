const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleID: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: String,
    avatar: String,
    googleRefreshToken: { type: String, required: true }, // Encrypted with AES-256
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);