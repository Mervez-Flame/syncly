const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage' // Tells Google the code originated from a native client
);

router.post('/google', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }

        // 1. Exchange authorization code for tokens
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        // 2. Fetch Google profile information
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { email, name, picture, sub: googleId } = ticket.getPayload();

        // 3. Find or create user in MongoDB
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                email,
                name,
                avatar: picture,
                googleId,
                refreshToken: tokens.refresh_token, // Saved for background Gmail/Calendar sync
            });
        } else if (tokens.refresh_token) {
            user.refreshToken = tokens.refresh_token;
            await user.save();
        }

        // 4. Issue FocusFlow session JWT
        const appToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'focusflow_jwt_secret',
            { expiresIn: '7d' }
        );

        res.json({
            token: appToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        console.error('Google Auth Exchange Error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
});

module.exports = router