// server/tests/taskValidator.test.js
// UT-04 and UT-05: validation module
const { validateExtractedTask } = require('../services/taskValidator');

const context = {
    emailReceivedAt: new Date('2026-11-05T10:00:00Z'),
    timezone: 'Africa/Lagos'
};

describe('Validation module', () => {
    // UT-04
    test('UT-04: a task with a null title is discarded with reason missing_title', () => {
        const result = validateExtractedTask(
            { title: null, description: 'Hand in the report', courseCode: 'CSC401', dueDate: '2026-11-20', dueTime: null },
            context
        );

        expect(result.ok).toBe(false);
        expect(result.reason).toBe('missing_title');
    });

    test('UT-04 (extra): empty and "null" titles are rejected the same way', () => {
        for (const title of ['', '   ', 'null']) {
            const result = validateExtractedTask({ title, dueDate: '2026-11-20' }, context);
            expect(result).toEqual({ ok: false, reason: 'missing_title' });
        }
    });

    // UT-05 (a)
    test('UT-05a: a valid due date earlier than the received date is kept as pending_sync', () => {
        const result = validateExtractedTask(
            { title: 'Submit report', description: '', courseCode: null, dueDate: '2026-11-01', dueTime: null },
            context
        );

        expect(result.ok).toBe(true);
        expect(result.task.dueDate).toEqual(new Date('2026-11-01T12:00:00.000Z')); // date unchanged
        expect(result.task.status).toBe('pending_sync');
    });

    // UT-05 (b)
    test('UT-05b: an unreadable date (2026-13-45) becomes null and the task is unscheduled', () => {
        const result = validateExtractedTask(
            { title: 'Submit report', description: '', courseCode: null, dueDate: '2026-13-45', dueTime: null },
            context
        );

        expect(result.ok).toBe(true);
        expect(result.task.dueDate).toBeNull();
        expect(result.task.status).toBe('unscheduled');
        expect(result.notes).toContain('due_date_dropped:unparseable');
    });
});
