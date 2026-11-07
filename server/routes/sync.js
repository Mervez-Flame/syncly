// server/routes/sync.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { runEmailSync } = require('../services/syncPipeline');
const { ExtractionError } = require('../services/aiExtractor');

router.get('/ping', (req, res) => {
    res.json({ ok: true, route: 'sync' });
});

// @route   POST /api/sync/emails
// @desc    Trigger AI email extraction and calendar sync
// @access  Private
router.post('/emails', auth, async (req, res) => {
    try {
        const { timezone } = req.body;

        // Run the orchestrator pipeline
        const summary = await runEmailSync(req.user.userId, { timezone });

        res.status(200).json(summary);
    } catch (error) {
        console.error('[Sync Route Error]:', error.message);

        // 1. Overlapping sync prevention
        if (error.code === 'SYNC_IN_PROGRESS') {
            return res.status(409).json({ code: 'SYNC_IN_PROGRESS', message: error.message });
        }

        // 2. Google OAuth / Permissions errors
        if (error.code === 'REAUTH_REQUIRED') {
            return res.status(403).json({ code: 'REAUTH_REQUIRED', message: error.message });
        }
        if (error.code === 'GMAIL_SCOPE_MISSING') {
            return res.status(403).json({ code: 'GMAIL_SCOPE_MISSING', message: error.message });
        }
        if (error.code === 'GMAIL_API_DISABLED') {
            return res.status(403).json({ code: 'GMAIL_API_DISABLED', message: error.message });
        }

        // 3. Fatal OpenAI API errors (Quota, 401, Model missing)
        if (error instanceof ExtractionError && error.isFatal) {
            // Never expose API keys or billing details to the client
            return res.status(503).json({
                code: 'AI_UNAVAILABLE',
                message: 'The AI service is temporarily unavailable. Please try again later.'
            });
        }

        // 4. Catch-all Server Error
        res.status(500).json({ code: 'SERVER_ERROR', message: 'An unexpected error occurred during synchronization.' });
    }
});

module.exports = router;