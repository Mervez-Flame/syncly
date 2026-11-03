const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    courseCode: String,
    dueDate: Date,
    isCompleted: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['unscheduled', 'pending_sync', 'synced', 'already_exists', 'sync_failed'],
        default: 'unscheduled'
    },
    source: { type: String, enum: ['ai', 'manual'], default: 'ai' },
    gmailMessageId: String,
    emailSubject: String,
    calendarEventId: String,
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);