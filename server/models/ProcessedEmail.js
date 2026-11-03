const mongoose = require('mongoose');

const ProcessedEmailSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gmailMessageId: { type: String, required: true, unique: true },
    processedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProcessedEmail', ProcessedEmailSchema);