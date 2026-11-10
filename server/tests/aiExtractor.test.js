// server/tests/aiExtractor.test.js
// UT-02, UT-03 (extraction parsing) and UT-10 (AI error classification), OpenAI mocked
const mockCreate = jest.fn();

jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({ chat: { completions: { create: mockCreate } } }))
}));
jest.mock('../config/syncConfig', () => ({ defaultTimezone: 'Africa/Lagos', openaiModel: 'gpt-4o-mini' }));
jest.mock('../services/prompts/taskExtraction', () => ({
    getSystemPrompt: jest.fn(() => 'system prompt'),
    getUserPrompt: jest.fn(() => 'user prompt'),
    PROMPT_VERSION: 'test-v1'
}));

const { extractTaskFromEmail, ExtractionError } = require('../services/aiExtractor');

const email = { subject: 'PHY201 Lab Report', body: 'Hand in by Friday', receivedAt: new Date('2026-11-05T10:00:00Z') };

const modelReplies = (content, finish_reason = 'stop') => ({
    choices: [{ finish_reason, message: { content } }],
    usage: { total_tokens: 120 }
});

beforeEach(() => mockCreate.mockReset());

describe('Extraction parsing module', () => {
    test('UT-02: valid LLM JSON is parsed into a task object with all fields', async () => {
        const task = {
            title: 'Optics Lab Report',
            description: 'Hand in the optics lab report',
            courseCode: 'PHY201',
            dueDate: '2026-11-13',
            dueTime: '16:00'
        };
        mockCreate.mockResolvedValue(modelReplies(JSON.stringify({ task })));

        const result = await extractTaskFromEmail(email);

        expect(result.task).toEqual(task);
        expect(result.meta.promptVersion).toBe('test-v1');
    });

    test('UT-03: {"task": null} returns a null task', async () => {
        mockCreate.mockResolvedValue(modelReplies('{"task": null}'));

        const result = await extractTaskFromEmail(email);

        expect(result.task).toBeNull();
        // that nothing is written to the database for a null task is checked in syncPipeline.test.js (UT-08)
    });
});

describe('AI error classification', () => {
    // UT-10 (a)
    test('UT-10a: a request timeout is non-fatal, so the email is retried on the next scan', async () => {
        mockCreate.mockRejectedValue(Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' }));

        const error = await extractTaskFromEmail(email).catch(e => e);

        expect(error).toBeInstanceOf(ExtractionError);
        expect(error.isFatal).toBe(false);
        expect(error.isPermanent).toBe(false);
    });

    // UT-10 (b)
    test('UT-10b: a 401 response is fatal', async () => {
        mockCreate.mockRejectedValue(Object.assign(new Error('Incorrect API key provided'), { status: 401 }));

        const error = await extractTaskFromEmail(email).catch(e => e);

        expect(error).toBeInstanceOf(ExtractionError);
        expect(error.isFatal).toBe(true);
    });

    test('UT-10 (extra): an exhausted quota (429 insufficient_quota) is fatal, an ordinary 429 is not', async () => {
        mockCreate.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429, error: { type: 'insufficient_quota' } }));
        mockCreate.mockRejectedValueOnce(Object.assign(new Error('slow down'), { status: 429, error: { type: 'rate_limit_exceeded' } }));

        const quota = await extractTaskFromEmail(email).catch(e => e);
        const rate = await extractTaskFromEmail(email).catch(e => e);

        expect(quota.isFatal).toBe(true);
        expect(rate.isFatal).toBe(false);
    });

    test('UT-10 (extra): a response cut off at the token limit is permanent, not fatal', async () => {
        mockCreate.mockResolvedValue(modelReplies('{"task": {"title": "Opt', 'length'));

        const error = await extractTaskFromEmail(email).catch(e => e);

        expect(error).toBeInstanceOf(ExtractionError);
        expect(error.isPermanent).toBe(true);
        expect(error.isFatal).toBe(false);
    });

    test('UT-10 (extra): unparseable JSON is permanent, not fatal', async () => {
        mockCreate.mockResolvedValue(modelReplies('this is not json'));

        const error = await extractTaskFromEmail(email).catch(e => e);

        expect(error).toBeInstanceOf(ExtractionError);
        expect(error.isPermanent).toBe(true);
        expect(error.isFatal).toBe(false);
    });
});
