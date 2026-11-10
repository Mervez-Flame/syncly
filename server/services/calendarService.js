
// server/services/calendarService.js
const { google } = require('googleapis');
const crypto = require('crypto');
const retry = require('../utils/retry');
const syncConfig = require('../config/syncConfig');

function formatEventTitle(task) {
    return task.courseCode ? `[${task.courseCode}] ${task.title}` : task.title;
}

function generateDeterministicEventId(userId, gmailMessageId) {
    // TEST ONLY: with EVENT_ID_SALT=random every call gets a fresh ID, so repeated timing
    // runs follow the same path as a first-ever scan. Leave unset in production.
    const salt = process.env.EVENT_ID_SALT === 'random'
        ? crypto.randomBytes(4).toString('hex')
        : (process.env.EVENT_ID_SALT || '');
    return crypto.createHash('sha1').update(`${userId}:${gmailMessageId}${salt}`).digest('hex');
}

/**
 * Searches for an existing event with the same normalized title around the deadline.
 */
async function findMatchingEvent(auth, task, timezone) {
    const calendar = google.calendar({ version: 'v3', auth });

    // Search window: +/- 1 day around the deadline
    const timeMin = new Date(task.dueDate.getTime() - 86400000).toISOString();
    const timeMax = new Date(task.dueDate.getTime() + 86400000).toISOString();
    const expectedTitle = formatEventTitle(task);

    const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        q: expectedTitle,
        singleEvents: true,
        timeZone: timezone
    });

    const events = res.data.items || [];
    const match = events.find(e => e.summary === expectedTitle);

    if (match) {
        return { eventId: match.id, htmlLink: match.htmlLink };
    }
    return null;
}

/**
 * Creates the calendar event.
 */
async function createEvent(auth, task, timezone) {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
        summary: formatEventTitle(task),
        description: `${task.emailSubject}\n\nCreated by FocusFlow`,
        id: generateDeterministicEventId(task.userId.toString(), task.gmailMessageId),
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 }       // 1 hour before
            ]
        },
        extendedProperties: {
            private: {
                focusflowTaskId: task._id?.toString() || task.localTaskId,
                gmailMessageId: task.gmailMessageId
            }
        }
    };

    if (task.hasDueTime) {
        // Timed event: 30 minutes ending exactly at the deadline
        event.end = { dateTime: task.dueDate.toISOString(), timeZone: timezone };
        event.start = {
            dateTime: new Date(task.dueDate.getTime() - 30 * 60000).toISOString(),
            timeZone: timezone
        };
    } else {
        // All-day event: start is the date, end is the next day
        const dateStr = task.dueDate.toISOString().slice(0, 10);
        const nextDayObj = new Date(task.dueDate.getTime() + 86400000);
        const nextDateStr = nextDayObj.toISOString().slice(0, 10);

        event.start = { date: dateStr, timeZone: timezone };
        event.end = { date: nextDateStr, timeZone: timezone };
    }

    try {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        console.log(`[cal] created new event ${res.data.id}`);
        return { eventId: res.data.id, htmlLink: res.data.htmlLink, alreadyExisted: false };
    } catch (error) {
        if (error.response?.status !== 409) throw error;

        // 409: the deterministic ID is already taken, so find out why
        let existing;
        try {
            existing = await calendar.events.get({ calendarId: 'primary', eventId: event.id });
        } catch (lookupError) {
            const code = lookupError.response?.status;
            if (code === 404 || code === 410) {
                // ID is reserved but the event is permanently gone,
                // so insert again and let Google generate a new ID
                const { id, ...eventWithoutId } = event;
                const res = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: eventWithoutId
                });
                return { eventId: res.data.id, htmlLink: res.data.htmlLink, alreadyExisted: false };
            }
            throw lookupError; // network or server errors go back to retry()
        }

        // Deleted but still in the bin: bring it back
        if (existing.data.status === 'cancelled') {
            const patched = await calendar.events.patch({
                calendarId: 'primary',
                eventId: event.id,
                resource: { ...event, status: 'confirmed' }
            });
            return { eventId: patched.data.id, htmlLink: patched.data.htmlLink, alreadyExisted: false };
        }

        // Really is on the calendar already
        return { eventId: event.id, htmlLink: existing.data.htmlLink || null, alreadyExisted: true };
    }
}

/**
 * Main entry point: checks for existing, then creates with retries.
 */
async function syncTaskToCalendar(auth, task, timezone = syncConfig.defaultTimezone) {
    try {
        // 1. Check if it already exists by fuzzy matching (just in case ID changed)
        const existing = await findMatchingEvent(auth, task, timezone);
        if (existing) {
            console.log(`[cal] ${task.gmailMessageId}: matched an existing event by title -> ${existing.eventId}`);
            return {
                status: 'already_exists',
                calendarEventId: existing.eventId,
                calendarEventLink: existing.htmlLink || null,
                error: null,
            };
        }

        // 2. Create the event using retries for transient errors
        const result = await retry(
            () => createEvent(auth, task, timezone),
            { attempts: syncConfig.calendarMaxRetries, baseDelayMs: 500 }
        );

        // 409 Conflict means success via ID idempotency
        if (result.alreadyExisted) {
            console.log(`[cal] 409 conflict for id ${event.id}`);
            return {
                status: 'already_exists',
                calendarEventId: result.eventId,
                calendarEventLink: result.htmlLink,
                error: null
            };
        }

        return {
            status: 'synced',
            calendarEventId: result.eventId,
            calendarEventLink: result.htmlLink,
            error: null
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown calendar error';
        return { status: 'sync_failed', calendarEventId: null, calendarEventLink: null, error: errorMessage };
    }
}

module.exports = {
    syncTaskToCalendar,
    findMatchingEvent,
    createEvent,
    generateDeterministicEventId
};