// server/utils/retry.js
const { isInvalidGrant, ReauthRequiredError } = require('./googleClient');

/**
 * Retries a promise-returning function with exponential backoff.
 */
async function retry(fn, { attempts = 3, baseDelayMs = 500 } = {}) {
    let attempt = 1;
    while (attempt <= attempts) {
        try {
            return await fn();
        } catch (error) {
            // Rethrow immediately if Google revoked access
            if (isInvalidGrant(error) || error instanceof ReauthRequiredError) {
                throw error;
            }

            const status = error.response?.status || error.code;
            const isNetworkError = !error.response && error.code; // ENOTFOUND, ECONNRESET, etc.
            const isRetryable = isNetworkError || status === 429 || (status >= 500 && status < 600);

            if (!isRetryable || attempt === attempts) {
                throw error;
            }

            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
        }
    }
}

module.exports = retry;