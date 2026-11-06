// Gmail side of the pipeline.
//
// RECEIVES : an authed Google client (from utils/googleClient.js), the userId, optional overrides
// RETURNS  : { emails, remaining, stats }
//   emails    -> up to maxEmails NEW emails, newest first, each already cleaned:
//                { messageId, threadId, from, subject, receivedAt, body, bodyTruncated }
//   remaining -> how many NEW emails are still waiting after this batch (0 = the window is cleared)
//   stats     -> { unreadInWindow, alreadyProcessed, fetched, fetchFailed, listTruncated }
//
// The Gmail "list" call only returns message IDs (cheap), so ALL unread IDs in the window are
// checked against ProcessedEmail first. Already-processed emails therefore never use up the cap.

const { google } = require('googleapis');
const ProcessedEmail = require('../models/ProcessedEmail');
const syncConfig = require('../config/syncConfig');
const { parseMessage } = require('../utils/emailParser');
const mapWithConcurrency = require('../utils/mapWithConcurrency');

const FETCH_CONCURRENCY = 5; // parallel "get message" calls to Gmail
const LIST_PAGE_SIZE = 100;
const MAX_LIST_IDS = 500;    // safety ceiling; a 14-day window should never get near it

function buildQuery(windowDays) {
    const afterEpochSeconds = Math.floor((Date.now() - windowDays * 24 * 60 * 60 * 1000) / 1000);
    return `in:inbox is:unread after:${afterEpochSeconds}`;
}

// Turns the two most common first-run Google errors into messages that say what to do
function explainGmailError(err) {
    const status = (err && err.response && err.response.status) || (err && err.code);
    const apiMessage =
        (err && err.response && err.response.data && err.response.data.error && err.response.data.error.message) ||
        (err && err.message) ||
        '';

    if (Number(status) === 403 && /has not been used|is disabled|not enabled/i.test(apiMessage)) {
        const e = new Error('The Gmail API is not enabled for this Google Cloud project. Enable it under APIs & Services > Library.');
        e.code = 'GMAIL_API_DISABLED';
        e.statusCode = 403;
        e.cause = err;
        return e;
    }

    if (Number(status) === 403 && /insufficient|scope/i.test(apiMessage)) {
        const e = new Error('Gmail permission is missing. Remove the app at myaccount.google.com/permissions, then sign in again and allow Gmail access.');
        e.code = 'GMAIL_SCOPE_MISSING';
        e.statusCode = 403;
        e.cause = err;
        return e;
    }

    return err;
}

async function listUnreadIds(gmail, query) {
    const ids = [];
    let pageToken;
    let truncated = false;

    do {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: LIST_PAGE_SIZE,
            pageToken,
        });

        (res.data.messages || []).forEach((m) => ids.push(m.id));
        pageToken = res.data.nextPageToken;

        if (ids.length >= MAX_LIST_IDS && pageToken) {
            truncated = true;
            break;
        }
    } while (pageToken);

    return { ids, truncated };
}

/**
 * @param {OAuth2Client} auth
 * @param {string|ObjectId} userId
 * @param {{ windowDays?: number, maxEmails?: number, gmailClient?: object }} [options]
 *        gmailClient is only for testing (inject a fake Gmail client)
 */
async function fetchUnprocessedEmails(auth, userId, options = {}) {
    const windowDays = options.windowDays || syncConfig.scanWindowDays;
    const maxEmails = options.maxEmails || syncConfig.maxEmailsPerScan;
    const gmail = options.gmailClient || google.gmail({ version: 'v1', auth });

    // 1. Every unread email ID in the window (IDs only, so this is cheap)
    let listing;
    try {
        listing = await listUnreadIds(gmail, buildQuery(windowDays));
    } catch (err) {
        throw explainGmailError(err);
    }
    const { ids, truncated } = listing;

    if (ids.length === 0) {
        return {
            emails: [],
            remaining: 0,
            stats: { unreadInWindow: 0, alreadyProcessed: 0, fetched: 0, fetchFailed: 0, listTruncated: false },
        };
    }

    // 2. Drop the ones this user has already been through
    const processedDocs = await ProcessedEmail
        .find({ userId, gmailMessageId: { $in: ids } })
        .select('gmailMessageId')
        .lean();
    const processedIds = new Set(processedDocs.map((d) => d.gmailMessageId));
    const unprocessedIds = ids.filter((id) => !processedIds.has(id));

    // 3. Apply the per-scan cap AFTER removing processed emails
    const idsToFetch = unprocessedIds.slice(0, maxEmails);
    const remaining = unprocessedIds.length - idsToFetch.length;

    // 4. Download and clean them. One failed download must not sink the whole scan:
    //    that email is simply not marked processed, so the next scan retries it.
    const results = await mapWithConcurrency(idsToFetch, FETCH_CONCURRENCY, async (id) => {
        const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        return parseMessage(res.data);
    });

    const emails = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const fetchFailed = results.length - emails.length;

    return {
        emails,
        remaining,
        stats: {
            unreadInWindow: ids.length,
            alreadyProcessed: processedIds.size,
            fetched: emails.length,
            fetchFailed,
            listTruncated: truncated,
        },
    };
}

module.exports = { fetchUnprocessedEmails, buildQuery };