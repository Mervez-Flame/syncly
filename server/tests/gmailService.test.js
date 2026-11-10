// server/tests/gmailService.test.js
// UT-06: idempotency check (database mocked, fake Gmail client injected)
jest.mock('googleapis', () => ({ google: { gmail: jest.fn() } }));
jest.mock('../models/ProcessedEmail', () => ({ find: jest.fn() }));
jest.mock('../utils/emailParser', () => ({
    parseMessage: jest.fn(data => ({ messageId: data.id, subject: `subject ${data.id}`, body: '' }))
}));
jest.mock('../utils/mapWithConcurrency', () =>
    jest.fn((items, _limit, worker) => Promise.allSettled(items.map(worker)))
);

const ProcessedEmail = require('../models/ProcessedEmail');
const { fetchUnprocessedEmails } = require('../services/gmailService');

function fakeGmail(ids) {
    return {
        users: {
            messages: {
                list: jest.fn().mockResolvedValue({ data: { messages: ids.map(id => ({ id })) } }),
                get: jest.fn(async ({ id }) => ({ data: { id } }))
            }
        }
    };
}

function processedRecords(ids) {
    ProcessedEmail.find.mockReturnValue({
        select: () => ({ lean: () => Promise.resolve(ids.map(gmailMessageId => ({ gmailMessageId }))) })
    });
}

beforeEach(() => jest.clearAllMocks());

describe('Idempotency check', () => {
    test('UT-06: an already-processed message ID is filtered out before extraction', async () => {
        const gmail = fakeGmail(['m1', 'm2', 'm3']);
        processedRecords(['m2']);

        const { emails, stats } = await fetchUnprocessedEmails({}, 'user-1', { gmailClient: gmail });

        expect(emails.map(e => e.messageId)).toEqual(['m1', 'm3']);
        expect(emails.map(e => e.messageId)).not.toContain('m2');
        // the processed email is never even downloaded, so it cannot reach the LLM
        const downloaded = gmail.users.messages.get.mock.calls.map(c => c[0].id);
        expect(downloaded).not.toContain('m2');
        expect(stats.alreadyProcessed).toBe(1);
        expect(ProcessedEmail.find).toHaveBeenCalledWith({ userId: 'user-1', gmailMessageId: { $in: ['m1', 'm2', 'm3'] } });
    });

    test('UT-06 (extra): processed emails do not use up the per-scan cap', async () => {
        const gmail = fakeGmail(['m1', 'm2', 'm3', 'm4']);
        processedRecords(['m1', 'm2']);

        const { emails, remaining } = await fetchUnprocessedEmails({}, 'user-1', { gmailClient: gmail, maxEmails: 2 });

        expect(emails.map(e => e.messageId)).toEqual(['m3', 'm4']);
        expect(remaining).toBe(0);
    });

    test('UT-06 (extra): when nothing is unread, the database is not even queried', async () => {
        const gmail = fakeGmail([]);

        const result = await fetchUnprocessedEmails({}, 'user-1', { gmailClient: gmail });

        expect(result.emails).toEqual([]);
        expect(ProcessedEmail.find).not.toHaveBeenCalled();
    });
});
