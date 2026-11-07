// Raw Gmail API message  ->  { messageId, threadId, from, subject, receivedAt, body }
// "body" is clean plain text: no HTML, no quoted replies, trimmed and length-capped.
// Pure functions only (no network, no database), so they are easy to test on their own.

const { convert } = require('html-to-text');

// Cap on how much of an email is ever sent to the LLM
const MAX_BODY_CHARS = 4000;

// Gmail sends body data as base64url
function decodeBase64Url(data = '') {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function getHeader(headers = [], name) {
    const header = headers.find((h) => h.name && h.name.toLowerCase() === name.toLowerCase());
    return header && header.value ? header.value.replace(/[\r\n]+/g, ' ').trim() : '';
}

// Walks the MIME tree and collects text parts. Attachments are skipped.
function collectTextParts(part, out) {
    if (!part || part.filename) return;

    if (part.parts && part.parts.length) {
        part.parts.forEach((child) => collectTextParts(child, out));
        return;
    }

    if (!part.body || !part.body.data) return;

    const mimeType = (part.mimeType || '').toLowerCase();
    if (mimeType === 'text/plain') out.plain.push(decodeBase64Url(part.body.data));
    else if (mimeType === 'text/html') out.html.push(decodeBase64Url(part.body.data));
}

function htmlToPlainText(html) {
    return convert(html, {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            // html-to-text UPPERCASES headings and table headers by default, which would
            // change the wording the LLM sees (and the titles it extracts). Keep original case.
            { selector: 'h1', options: { uppercase: false } },
            { selector: 'h2', options: { uppercase: false } },
            { selector: 'h3', options: { uppercase: false } },
            { selector: 'h4', options: { uppercase: false } },
            { selector: 'h5', options: { uppercase: false } },
            { selector: 'h6', options: { uppercase: false } },
            // Render tables as rows of separated cells (deadline tables are common in school emails)
            { selector: 'table', format: 'dataTable', options: { uppercaseHeaderCells: false } },
        ],
    });
}

function normalizeWhitespace(text) {
    return text
        .replace(/\r\n?/g, '\n')
        // Marketing emails pad their preview text with invisible characters (e.g. U+034F). Remove them.
        .replace(/[\u034f\u00ad\u2060\u180e\u200b-\u200f\ufeff]/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Removes the quoted thread under a reply ("On Tue, 4 Nov 2025 ... wrote:") and ">" lines.
// Forwarded messages are deliberately NOT cut, because for those the forwarded text IS the content.
function stripQuotedReply(text) {
    let result = text;

    const marker = /\n[ \t]*On\s[\s\S]{1,300}?\swrote:[ \t]*(\n|$)/.exec(result);
    if (marker && marker.index > 0 && /(\d{4}|@)/.test(marker[0])) {
        result = result.slice(0, marker.index);
    }

    return result
        .split('\n')
        .filter((line) => !/^\s*>/.test(line))
        .join('\n');
}

// Long URLs (especially Google/tracking redirects) add noise and cost tokens, and the
// LLM never needs the address itself. Inline links become [link]; lines that are ONLY
// links (newsletter footers, social icons) and "[image: ...]" placeholders are dropped.
function replaceLinks(text) {
    return text
        .replace(/<?https?:\/\/[^\s<>"')\]]+>?/gi, '[link]')
        .replace(/\[image:[^\]]*\]/gi, '')
        .split('\n')
        .filter((line) => !(line.includes('[link]') && line.replace(/\[link\]/g, '').trim() === ''))
        .join('\n');
}

function extractBody(payload) {
    const parts = { plain: [], html: [] };
    collectTextParts(payload, parts);

    // Prefer the plain-text version; fall back to converting the HTML version
    let text = parts.plain.join('\n\n').trim();
    if (!text && parts.html.length) {
        text = htmlToPlainText(parts.html.join('\n'));
    }

    text = normalizeWhitespace(replaceLinks(stripQuotedReply(normalizeWhitespace(text))));

    const truncated = text.length > MAX_BODY_CHARS;
    if (truncated) text = text.slice(0, MAX_BODY_CHARS).trimEnd();

    return { body: text, truncated };
}

// When Gmail received the message (more reliable than the Date header the sender wrote)
function getReceivedAt(message, headers) {
    const fromGmail = message.internalDate ? new Date(Number(message.internalDate)) : null;
    if (fromGmail && !Number.isNaN(fromGmail.getTime())) return fromGmail.toISOString();

    const fromHeader = new Date(getHeader(headers, 'Date'));
    return Number.isNaN(fromHeader.getTime()) ? null : fromHeader.toISOString();
}

/**
 * @param {object} message  one Gmail API message fetched with format "full"
 * @returns {{ messageId, threadId, from, subject, receivedAt, body, bodyTruncated }}
 *          receivedAt is an ISO string; body may be '' if the email had no readable text
 */
function parseMessage(message) {
    const headers = (message.payload && message.payload.headers) || [];
    const { body, truncated } = extractBody(message.payload);

    return {
        messageId: message.id,
        threadId: message.threadId,
        from: getHeader(headers, 'From'),
        subject: getHeader(headers, 'Subject'),
        receivedAt: getReceivedAt(message, headers),
        body,
        bodyTruncated: truncated,
    };
}

module.exports = { parseMessage, MAX_BODY_CHARS };