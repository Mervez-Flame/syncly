const mongoose = require('mongoose');
const crypto = require('crypto');

const TaskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Generated on the phone or server.
    // Remains the same across synchronization attempts.
    localTaskId: {
        type: String,
        required: true,
        default: () => crypto.randomUUID()
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    description: String,
    courseCode: String,
    dueDate: Date,

    isCompleted: {
        type: Boolean,
        default: false
    },

    // Calendar synchronization status
    status: {
        type: String,
        enum: [
            'unscheduled',
            'pending_sync',
            'synced',
            'already_exists',
            'sync_failed'
        ],
        default: 'unscheduled'
    },

    source: {
        type: String,
        enum: ['ai', 'manual'],
        default: 'manual'
    },

    gmailMessageId: String,
    emailSubject: String,
    calendarEventId: String,

    // Soft deletion
    isDeleted: {
        type: Boolean,
        default: false
    },

    deletedAt: {
        type: Date,
        default: null
    },

    syncState: {
        type: String,
        enum: [
            'pending_create',
            'pending_update',
            'pending_delete',
            'synced'
        ],
        default: 'synced' // Defaults to synced for tasks created online by the AI pipeline
    },

}, { timestamps: true });

// Prevent duplicate tasks when the phone retries synchronization.
TaskSchema.index(
    { userId: 1, localTaskId: 1 },
    { unique: true }
);

module.exports = mongoose.model('Task', TaskSchema);