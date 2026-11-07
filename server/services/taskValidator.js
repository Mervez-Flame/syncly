// server/services/taskValidator.js

/**
 * Normalizes a course code to "LETTERS SPACE DIGITS" (e.g. "csc401" -> "CSC 401").
 */
function normalizeCourseCode(code) {
    if (!code || typeof code !== 'string') return null;
    const trimmed = code.trim().toUpperCase();
    if (trimmed === 'N/A' || trimmed === 'NULL' || trimmed === '') return null;

    // Insert a space between letters and numbers if missing
    return trimmed.replace(/^([A-Z]+)(\d+.*)$/, '$1 $2');
}

/**
 * Checks if the deadline is strictly before the received date (comparing calendar days).
 */
function isDateInPast(dateStr, receivedAtStr) {
    const deadlineDay = dateStr.slice(0, 10);
    const receivedDay = new Date(receivedAtStr).toISOString().slice(0, 10);
    return deadlineDay < receivedDay;
}

/**
 * Converts a YYYY-MM-DD and optional HH:MM into a UTC Date object.
 * As per Section 4 conventions:
 * - Timed: Exact instant based on timezone (simplified to UTC+1 for Lagos).
 * - Date-only: Noon UTC on that calendar day.
 */
function createDeadlineDate(dateStr, timeStr, hasTime, timezone) {
    if (!hasTime) {
        return new Date(`${dateStr}T12:00:00.000Z`);
    }

    // For Africa/Lagos (UTC+1). In a full multi-tz app, you'd use date-fns-tz.
    const offset = timezone === 'Africa/Lagos' ? '+01:00' : '+00:00';
    const dateObj = new Date(`${dateStr}T${timeStr}:00.000${offset}`);

    // Fallback if Date creation failed
    return isNaN(dateObj.getTime()) ? null : dateObj;
}

/**
 * Validates and normalizes the raw task extracted by OpenAI.
 * @param {Object} rawTask - Task extracted from AI
 * @param {Object} context - { emailReceivedAt, timezone }
 * @returns {Object} - { ok: true, task: Object, notes: Array } OR { ok: false, reason: String }
 */
function validateExtractedTask(rawTask, { emailReceivedAt, timezone }) {
    if (!rawTask) {
        return { ok: false, reason: 'null_task' };
    }

    const title = (rawTask.title || '').trim();
    if (!title || title.toLowerCase() === 'null') {
        return { ok: false, reason: 'missing_title' };
    }

    const notes = [];
    let courseCode = normalizeCourseCode(rawTask.courseCode);
    let description = typeof rawTask.description === 'string' ? rawTask.description.trim() : '';

    // Enforce length limits (Section 3.7.2)
    const finalTitle = title.substring(0, 200);
    if (description.length > 500) {
        description = description.substring(0, 497) + '...';
        notes.push('description_truncated');
    }
    if (description.toLowerCase() === 'null') description = '';

    // Date and Time handling
    let dueDate = null;
    let hasDueTime = false;

    const rawDate = typeof rawTask.dueDate === 'string' ? rawTask.dueDate.trim() : null;
    const rawTime = typeof rawTask.dueTime === 'string' ? rawTask.dueTime.trim() : null;

    // Validate time format (HH:MM in 24h)
    if (rawTime && /^([01]\d|2[0-3]):([0-5]\d)$/.test(rawTime)) {
        hasDueTime = true;
    }

    // Validate date format (YYYY-MM-DD)
    if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        if (isDateInPast(rawDate, emailReceivedAt)) {
            notes.push('due_date_dropped:in_past');
        } else {
            dueDate = createDeadlineDate(rawDate, rawTime, hasDueTime, timezone);
            if (!dueDate) notes.push('due_date_dropped:unparseable');
        }
    }

    // If no valid date was constructed, time flag must be false
    if (!dueDate) {
        hasDueTime = false;
    }

    const status = dueDate ? 'pending_sync' : 'unscheduled';

    return {
        ok: true,
        task: {
            title: finalTitle,
            description,
            courseCode,
            dueDate,
            hasDueTime,
            status
        },
        notes
    };
}

module.exports = {
    validateExtractedTask
};