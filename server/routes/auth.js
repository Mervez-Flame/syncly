const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { encrypt } = require('../utils/crypto');

const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    '' //
);

// @route   POST /api/auth/google
// @desc    Exchange Google auth code for refresh tokens, store user, return JWT
// @access  Public
router.post('/google', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required' });
        }

        // 1. Exchange OAuth code for Google tokens
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // 2. Decode and verify user Google ID token
        const ticket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        const { sub: googleID, email, name, picture: avatar } = payload;

        // 3. Locate or upsert user document
        let user = await User.findOne({ googleID });

        if (user) {
            user.name = name;
            user.avatar = avatar;
            if (tokens.refresh_token) {
                user.googleRefreshToken = encrypt(tokens.refresh_token);
            }
            await user.save();
        } else {
            if (!tokens.refresh_token) {
                return res.status(400).json({
                    message: 'Refresh token missing. User must grant offline access consent.',
                });
            }

            user = await User.create({
                googleID,
                email,
                name,
                avatar,
                googleRefreshToken: encrypt(tokens.refresh_token),
            });
        }

        // 4. Issue custom application JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Authentication process failed', error: error.message });
    }
});

module.exports = router;