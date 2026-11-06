// Central place for every tunable value used by the email sync pipeline.

const toPositiveInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

module.exports = Object.freeze({
    // How far back Gmail is searched for unread emails (days)
    scanWindowDays: toPositiveInt(process.env.GMAIL_SCAN_WINDOW_DAYS, 14),

    // Max NEW (not yet processed) emails handled in one scan
    maxEmailsPerScan: toPositiveInt(process.env.GMAIL_MAX_EMAILS_PER_SCAN, 25),

    // How many emails are sent to OpenAI at the same time
    aiConcurrency: toPositiveInt(process.env.AI_CONCURRENCY, 4),

    // Used when the phone does not send its own timezone
    defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Africa/Lagos',

    // Attempts for each Google Calendar call (exponential backoff between them)
    calendarMaxRetries: toPositiveInt(process.env.CALENDAR_MAX_RETRIES, 3),

    // No default on purpose: aiExtractor.js will refuse to run if this is empty, so the exact model used for your evaluation is always one you chose.
    openaiModel: process.env.OPENAI_MODEL || '',
});