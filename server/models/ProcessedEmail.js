const mongoose = require('mongoose');

const ProcessedEmailSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gmailMessageId: { type: String, required: true },

    // What the pipeline decided for this email. Lets you count the LLM's
    // "task" vs "no task" decisions straight from the database during evaluation.
    outcome: {
        type: String,
        enum: [
            'no_task',        // the LLM returned null
            'invalid',        // a task came back but failed validation
            'unscheduled',    // task saved, but no due date was found
            'pending_sync',   // task saved, calendar sync not finished yet
            'synced',         // event created on Google Calendar
            'already_exists', // a matching calendar event was already there
            'sync_failed'     // calendar sync failed after all retries
        ]
    },

    processedAt: { type: Date, default: Date.now }
});

// Unique per USER (the old schema made gmailMessageId unique across all users).
ProcessedEmailSchema.index(
    { userId: 1, gmailMessageId: 1 },
    { unique: true }
);

module.exports = mongoose.model('ProcessedEmail', ProcessedEmailSchema);


// const mongoose = require('mongoose');

// const ProcessedEmailSchema = new mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     gmailMessageId: { type: String, required: true, unique: true },
//     processedAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('ProcessedEmail', ProcessedEmailSchema);