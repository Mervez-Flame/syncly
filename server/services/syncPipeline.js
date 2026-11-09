const { getAuthedClient, ReauthRequiredError } = require('../utils/googleClient');
const { fetchUnprocessedEmails } = require('./gmailService');
const { extractTaskFromEmail, ExtractionError } = require('./aiExtractor');
const { validateExtractedTask } = require('./taskValidator');
const { syncTaskToCalendar } = require('./calendarService');
const mapWithConcurrency = require('../utils/mapWithConcurrency');
const syncConfig = require('../config/syncConfig');
const Task = require('../models/Task');
const ProcessedEmail = require('../models/ProcessedEmail');

// In-memory set to prevent parallel syncs for the same user
const activeSyncs = new Set();

/**
 * Runs the email synchronization pipeline for a user.
 * @param {string} userId - The user's database ID
 * @param {Object} options - { timezone }
 * @returns {Promise<Object>} - Summary statistics of the sync
 */
async function runEmailSync(userId, { timezone = syncConfig.defaultTimezone } = {}) {
    const userIdStr = userId.toString();

    if (activeSyncs.has(userIdStr)) {
        const error = new Error('A sync is already running for this user');
        error.code = 'SYNC_IN_PROGRESS';
        throw error;
    }

    activeSyncs.add(userIdStr);
    const startTime = Date.now();

    const summary = {
        scanned: 0,
        noTask: 0,
        invalid: 0,
        tasksCreated: 0,
        synced: 0,
        alreadyExists: 0,
        unscheduled: 0,
        syncFailed: 0,
        aiErrors: 0,
        remaining: 0,
        durationMs: 0,
        retried: 0,
    };

    try {
        const auth = await getAuthedClient(userId);
        // Retry earlier failures first (no Gmail or AI call needed)
        const stuckTasks = await Task.find({
            userId,
            source: 'ai',
            isDeleted: false,
            status: { $in: ['sync_failed', 'pending_sync'] },
            dueDate: { $ne: null }
        });

        for (const stuck of stuckTasks) {
            const calResult = await syncTaskToCalendar(auth, stuck, timezone);
            stuck.status = calResult.status;
            stuck.calendarEventId = calResult.calendarEventId;
            stuck.calendarEventLink = calResult.calendarEventLink;
            stuck.lastSyncError = calResult.error;
            await stuck.save();
            await ProcessedEmail.updateOne(
                { userId, gmailMessageId: stuck.gmailMessageId },
                { outcome: calResult.status }
            );
            summary.retried++;
        }
        const { emails, remaining } = await fetchUnprocessedEmails(auth, userId);

        summary.remaining = remaining;
        summary.scanned = emails.length;

        if (emails.length === 0) {
            summary.durationMs = Date.now() - startTime;
            return summary;
        }

        let fatalError = null;

        const processEmail = async (email) => {
            if (fatalError) return null; // Short-circuit if a previous email triggered a fatal error

            try {
                // 1. AI Extraction
                const { task: rawTask } = await extractTaskFromEmail(email, { timezone });

                if (!rawTask) {
                    await ProcessedEmail.create({ userId, gmailMessageId: email.messageId, outcome: 'no_task' });
                    return 'no_task';
                }

                // 2. Validation
                const validation = validateExtractedTask(rawTask, { emailReceivedAt: email.receivedAt, timezone });

                if (!validation.ok) {
                    await ProcessedEmail.create({ userId, gmailMessageId: email.messageId, outcome: 'invalid' });
                    return 'invalid';
                }
                const taskData = validation.task;

                // 3. Persistence (Check for existing task to prevent duplicates)
                let task = await Task.findOne({ userId, gmailMessageId: email.messageId });
                if (!task) {
                    task = await Task.create({
                        userId,
                        title: taskData.title,
                        description: taskData.description,
                        courseCode: taskData.courseCode,
                        dueDate: taskData.dueDate,
                        hasDueTime: taskData.hasDueTime,
                        status: taskData.status,
                        source: 'ai',
                        gmailMessageId: email.messageId,
                        emailSubject: email.subject
                    });
                    summary.tasksCreated++;
                }

                // 4. Calendar Sync (Only if there is a due date)
                let finalOutcome = task.status;
                if (task.dueDate && task.status !== 'synced' && task.status !== 'already_exists') {
                    const calResult = await syncTaskToCalendar(auth, task, timezone);
                    finalOutcome = calResult.status;
                    task.status = calResult.status;
                    task.calendarEventId = calResult.calendarEventId;
                    task.calendarEventLink = calResult.calendarEventLink; // new line
                    task.lastSyncError = calResult.error;
                    await task.save();
                }

                // 5. Record final processing outcome
                await ProcessedEmail.create({ userId, gmailMessageId: email.messageId, outcome: finalOutcome });
                return finalOutcome;

            } catch (error) {
                console.error(`\n❌ [Pipeline error on email ${email.messageId}]:`, error.message);

                // 11000 is MongoDB's duplicate key error (meaning another thread got here first)
                if (error.code === 11000) {
                    return 'duplicate_handled';
                }

                if (error instanceof ExtractionError && error.isFatal) {
                    fatalError = error;
                    throw error;
                }

                if (error instanceof ReauthRequiredError) {
                    fatalError = error;
                    throw error;
                }

                if (error instanceof ExtractionError && error.isPermanent) {
                    await ProcessedEmail.updateOne(
                        { userId, gmailMessageId: email.messageId },
                        { $setOnInsert: { outcome: 'invalid' } },
                        { upsert: true }
                    );
                    return 'invalid';
                }
                // Count non-fatal AI timeouts/errors so they can be retried on the next scan
                return 'ai_error';
            }
        };

        const results = await mapWithConcurrency(emails, syncConfig.aiConcurrency, processEmail);

        // Surface the fatal error to the route handler if one occurred
        if (fatalError) {
            throw fatalError;
        }

        // Aggregate stats from the worker results
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const outcome = result.value;
                if (outcome === 'no_task') summary.noTask++;
                if (outcome === 'invalid') summary.invalid++;
                if (outcome === 'synced') summary.synced++;
                if (outcome === 'already_exists') summary.alreadyExists++;
                if (outcome === 'unscheduled') summary.unscheduled++;
                if (outcome === 'sync_failed') summary.syncFailed++;
                if (outcome === 'ai_error') summary.aiErrors++;
            } else {
                summary.aiErrors++;
            }
        }

        summary.durationMs = Date.now() - startTime;
        return summary;

    } finally {
        activeSyncs.delete(userIdStr);
    }
}

module.exports = { runEmailSync };