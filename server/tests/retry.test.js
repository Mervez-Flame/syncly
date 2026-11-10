// server/tests/retry.test.js
// UT-09: retry helper (timers mocked)
jest.mock('../utils/googleClient', () => ({
    isInvalidGrant: jest.fn(() => false),
    ReauthRequiredError: class ReauthRequiredError extends Error {}
}));

const retry = require('../utils/retry');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Retry helper', () => {
    test('UT-09a: a 503 on every call is tried exactly 3 times (500 ms, then 1 s), then the error is thrown', async () => {
        const start = Date.now();
        const callTimes = [];
        const error = Object.assign(new Error('Service Unavailable'), { response: { status: 503 } });
        const fn = jest.fn(async () => {
            callTimes.push(Date.now() - start);
            throw error;
        });

        const outcome = retry(fn, { attempts: 3, baseDelayMs: 500 }).catch(e => e);
        await jest.advanceTimersByTimeAsync(5000);

        expect(await outcome).toBe(error);
        expect(fn).toHaveBeenCalledTimes(3);
        expect(callTimes).toEqual([0, 500, 1500]); // +0 ms, +500 ms, then another 1000 ms
    });

    test('UT-09b: a 403 is not retryable, so there is exactly one attempt', async () => {
        const error = Object.assign(new Error('Forbidden'), { response: { status: 403 } });
        const fn = jest.fn(async () => { throw error; });

        const outcome = retry(fn, { attempts: 3, baseDelayMs: 500 }).catch(e => e);
        await jest.advanceTimersByTimeAsync(5000);

        expect(await outcome).toBe(error);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('UT-09 (extra): a transient 503 followed by success returns the result', async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(Object.assign(new Error('Busy'), { response: { status: 503 } }))
            .mockResolvedValueOnce('done');

        const outcome = retry(fn, { attempts: 3, baseDelayMs: 500 });
        await jest.advanceTimersByTimeAsync(1000);

        await expect(outcome).resolves.toBe('done');
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
