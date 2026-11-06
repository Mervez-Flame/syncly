// userId -> authenticated Google OAuth2 client.
// Used by gmailService.js and calendarService.js so token handling lives in ONE place.

const { google } = require('googleapis');
const User = require('../models/User');
const { decrypt } = require('./crypto');

// Thrown when Google no longer accepts the stored refresh token.
// The sync route should turn this into a response the app can act on
// (for example: show the Google sign-in screen again).
class ReauthRequiredError extends Error {
    constructor(message = 'Google access was revoked or has expired. Please sign in with Google again.') {
        super(message);
        this.name = 'ReauthRequiredError';
        this.code = 'REAUTH_REQUIRED';
        this.statusCode = 403;
    }
}

// Google reports a dead refresh token as "invalid_grant".
function isInvalidGrant(err) {
    return (
        err?.response?.data?.error === 'invalid_grant' ||
        /invalid_grant/i.test(err?.message || '')
    );
}

/**
 * @param {string|ObjectId} userId  Mongo _id of the user (req.user.userId)
 * @returns {Promise<OAuth2Client>} client ready to pass as `auth` to google.gmail / google.calendar
 * @throws  {ReauthRequiredError}   refresh token revoked or expired (user is flagged needsReauth)
 * @throws  {Error}                 user not found, or the stored token could not be decrypted
 */
async function getAuthedClient(userId) {
    const user = await User.findById(userId).select('googleRefreshToken needsReauth');
    if (!user) {
        throw new Error('User not found');
    }

    let refreshToken;
    try {
        refreshToken = decrypt(user.googleRefreshToken);
    } catch (err) {
        throw new Error('Could not decrypt the stored Google refresh token. Check that ENCRYPTION_KEY has not changed.');
    }

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials({ refresh_token: refreshToken });

    // Force the token refresh NOW instead of on the first API call, so a dead
    // token is caught here, once, and not halfway through a batch of emails.
    try {
        await client.getAccessToken();
    } catch (err) {
        if (isInvalidGrant(err)) {
            await User.updateOne({ _id: userId }, { needsReauth: true });
            throw new ReauthRequiredError();
        }
        throw err;
    }

    // Token works, so clear the flag if an earlier failure had set it
    if (user.needsReauth) {
        await User.updateOne({ _id: userId }, { needsReauth: false });
    }

    return client;
}

module.exports = { getAuthedClient, ReauthRequiredError, isInvalidGrant };