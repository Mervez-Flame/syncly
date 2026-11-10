// server/tests/syncPipeline.test.js
// UT-07, UT-08 (state management, outcome logging) and the pipeline side of UT-10 (database mocked)

jest.mock('../utils/googleClient', () => ({
    getAuthedClient: jest.fn(),
    ReauthRequiredError: class ReauthRequiredError extends Error {}
}));
jest.mock('../services/gmailService', () => ({ fetchUnprocessedEmails: jest.fn() }));
// Use the REAL ExtractionError class, but replace the OpenAI call itself
jest.mock('openai', () => ({ OpenAI: jest.fn().mockImplementation(() => ({})) }));
jest.mock('../services/prompts/taskExtraction', () => ({
    getSystemPrompt: jest.fn(), getUserPrompt: jest.fn(), PROMPT_VERSION: 'test'
}));
jest.mock('../services/aiExtractor', () => {
    const actual = jest.requireActual('../services/aiExtractor');
    return { ...actual, extractTaskFromEmail: jest.fn() };
});
jest.mock('../services/calendarService', () => ({ syncTaskToCalendar: jest.fn() }));
jest.mock('../utils/mapWithConcurrency', () =>
    // same result shape the pipeline expects: [{ status, value | reason }]
    jest.fn((items, _limit, worker) => Promise.allSettled(items.map(worker)))
);
jest.mock('../config/syncConfig', () => ({ defaultTimezone: 'Africa/Lagos', aiConcurrency: 4 }));
jest.mock('../models/Task', () => ({ find: jest.fn(), findOne: jest.fn(), create: jest.fn() }));
jest.mock('../models/ProcessedEmail', () => ({ create: jest.fn(), updateOne: jest.fn() }));

const { getAuthedClient } = require('../utils/googleClient');
const { fetchUnprocessedEmails } = require('../services/gmailService');
const { extractTaskFromEmail, ExtractionError } = require('../services/aiExtractor');
const { syncTaskToCalendar } = require('../services/calendarService');
const Task = require('../models/Task');
const ProcessedEmail = require('../models/ProcessedEmail');
const { runEmailSync } = require('../services/syncPipeline');

const USER_ID = 'user-123';
const email = {
    messageId: 'msg-1',
    subject: 'PHY201 Lab Report',
    receivedAt: new Date('2026-11-05T10:00:00Z')
};

beforeEach(() => {
    jest.clearAllMocks();
    getAuthedClient.mockResolvedValue({});
    fetchUnprocessedEmails.mockResolvedValue({ emails: [email], remaining: 0 });
    Task.find.mockResolvedValue([]);      // no stuck tasks to retry
    Task.findOne.mockResolvedValue(null); // no existing task for this email
    Task.create.mockImplementation(async data => ({ ...data, save: jest.fn().mockResolvedValue() }));
    ProcessedEmail.create.mockResolvedValue({});
    syncTaskToCalendar.mockResolvedValue({
        status: 'synced', calendarEventId: 'evt-1', calendarEventLink: 'https://calendar.example/evt-1', error: null
    });
});

describe('State management logic', () => {
    // UT-07 (a)
    test('UT-07a: a validated task with a due date is stored as pending_sync with no calendarEventId', async () => {
        extractTaskFromEmail.mockResolvedValue({
            task: { title: 'Optics Lab Report', description: '', courseCode: 'phy201', dueDate: '2026-11-20', dueTime: null }
        });

        await runEmailSync(USER_ID);

        expect(Task.create).toHaveBeenCalledTimes(1);
        const stored = Task.create.mock.calls[0][0];
        expect(stored.status).toBe('pending_sync');
        expect(stored.calendarEventId).toBeUndefined();
        expect(stored.gmailMessageId).toBe('msg-1');
    });

    // UT-07 (b)
    test('UT-07b: a validated task with no due date is stored as unscheduled and never sent to the calendar', async () => {
        extractTaskFromEmail.mockResolvedValue({
            task: { title: 'Optics Lab Report', description: '', courseCode: 'phy201', dueDate: null, dueTime: null }
        });

        await runEmailSync(USER_ID);

        const stored = Task.create.mock.calls[0][0];
        expect(stored.status).toBe('unscheduled');
        expect(syncTaskToCalendar).not.toHaveBeenCalled();
        expect(ProcessedEmail.create).toHaveBeenCalledWith(
            expect.objectContaining({ gmailMessageId: 'msg-1', outcome: 'unscheduled' })
        );
    });
});

describe('Pipeline outcome logging', () => {
    // UT-08
    test('UT-08: a null LLM result is recorded in PROCESSED_EMAILS as no_task and no task is created', async () => {
        extractTaskFromEmail.mockResolvedValue({ task: null });

        const summary = await runEmailSync(USER_ID);

        expect(ProcessedEmail.create).toHaveBeenCalledTimes(1);
        expect(ProcessedEmail.create).toHaveBeenCalledWith({
            userId: USER_ID,
            gmailMessageId: 'msg-1',
            outcome: 'no_task'
        });
        expect(Task.create).not.toHaveBeenCalled();
        expect(summary.noTask).toBe(1);
    });
});

describe('AI error handling in the pipeline', () => {
    beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
    afterEach(() => console.error.mockRestore());

    // UT-10 (a), pipeline side
    test('UT-10a: a non-fatal AI error is caught, nothing is written, and the email is left for the next scan', async () => {
        extractTaskFromEmail.mockRejectedValue(new ExtractionError('Request timed out.', null, false, false));

        const summary = await runEmailSync(USER_ID);

        expect(summary.aiErrors).toBe(1);
        expect(ProcessedEmail.create).not.toHaveBeenCalled();
        expect(ProcessedEmail.updateOne).not.toHaveBeenCalled();
        expect(Task.create).not.toHaveBeenCalled();
    });

    // UT-10 (b), pipeline side
    test('UT-10b: a fatal AI error aborts the scan and is passed up to the caller', async () => {
        const fatal = new ExtractionError('Incorrect API key provided', { status: 401 }, true, false);
        extractTaskFromEmail.mockRejectedValue(fatal);

        await expect(runEmailSync(USER_ID)).rejects.toBe(fatal);

        expect(fatal.isFatal).toBe(true);
        expect(ProcessedEmail.create).not.toHaveBeenCalled();
    });

    test('UT-10 (extra): a permanent AI error (cut-off or unparseable reply) is recorded as invalid', async () => {
        extractTaskFromEmail.mockRejectedValue(new ExtractionError('Unparseable JSON returned by model', null, false, true));

        const summary = await runEmailSync(USER_ID);

        expect(summary.invalid).toBe(1);
        expect(ProcessedEmail.updateOne).toHaveBeenCalledWith(
            { userId: USER_ID, gmailMessageId: 'msg-1' },
            { $setOnInsert: { outcome: 'invalid' } },
            { upsert: true }
        );
    });
});
