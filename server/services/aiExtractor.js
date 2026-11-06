// server/services/aiExtractor.js
const { OpenAI } = require('openai');
const syncConfig = require('../config/syncConfig');
const { getSystemPrompt, getUserPrompt, PROMPT_VERSION } = require('./prompts/taskExtraction');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000 // 30-second client timeout
});

class ExtractionError extends Error {
    constructor(message, originalError, isFatal = false) {
        super(message);
        this.name = 'ExtractionError';
        this.originalError = originalError;
        this.isFatal = isFatal;
        this.status = originalError?.status;
    }
}

/**
 * Extracts task information from an email using OpenAI.
 * @param {Object} email - { subject, body, receivedAt }
 * @param {Object} options - { timezone, effort, model }
 * @returns {Promise<Object>} - { task: Object|null, meta: Object }
 */
async function extractTaskFromEmail(email, { timezone = syncConfig.defaultTimezone, effort, model: overrideModel } = {}) {
    const startTime = Date.now();
    const model = overrideModel || syncConfig.openaiModel;
    const reasoningEffort = effort || process.env.OPENAI_REASONING_EFFORT || 'low';
    const isReasoning = model.startsWith('gpt-6') || model.startsWith('o1') || model.startsWith('o3');

    try {
        const payload = {
            model: model,
            messages: [
                { role: 'system', content: getSystemPrompt(email.receivedAt, timezone) },
                { role: 'user', content: getUserPrompt(email) }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "task_extraction",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            task: {
                                anyOf: [
                                    {
                                        type: "object",
                                        properties: {
                                            title: { type: "string" },
                                            description: { type: ["string", "null"] },
                                            courseCode: { type: ["string", "null"] },
                                            dueDate: { type: ["string", "null"] },
                                            dueTime: { type: ["string", "null"] }
                                        },
                                        required: ["title", "description", "courseCode", "dueDate", "dueTime"],
                                        additionalProperties: false
                                    },
                                    { type: "null" }
                                ]
                            }
                        },
                        required: ["task"],
                        additionalProperties: false
                    }
                }
            },
            max_completion_tokens: 2000
        };

        if (isReasoning) {
            payload.reasoning_effort = reasoningEffort;
        } else {
            payload.temperature = 0;
        }

        const response = await openai.chat.completions.create(payload);
        const choice = response.choices[0];

        if (choice.finish_reason === 'length') {
            throw new Error('LLM max tokens exceeded (length constraint)');
        }

        let parsedResult;
        try {
            parsedResult = JSON.parse(choice.message.content);
        } catch (err) {
            throw new Error('Unparseable JSON returned by model');
        }

        const latencyMs = Date.now() - startTime;
        return {
            task: parsedResult.task,
            meta: {
                model,
                reasoningEffort: isReasoning ? reasoningEffort : 'N/A',
                latencyMs,
                tokens: response.usage?.total_tokens,
                promptVersion: PROMPT_VERSION
            }
        };

    } catch (error) {
        // If it's already our wrapped error, rethrow
        if (error instanceof ExtractionError) throw error;

        const isFatal = error.status === 401 ||
            error.status === 400 ||
            error.status === 404 ||
            (error.status === 429 && error.error?.type === 'insufficient_quota');

        throw new ExtractionError(
            error.message || 'AI Extraction failed',
            error,
            isFatal
        );
    }
}

module.exports = {
    extractTaskFromEmail,
    ExtractionError
};