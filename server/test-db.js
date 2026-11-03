require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Define a temporary inline schema for testing
const TestSchema = new mongoose.Schema({ name: String, createdAt: { type: Date, default: Date.now } });
const TestModel = mongoose.model('ConnectionTest', TestSchema);

const runTest = async () => {
    try {
        await connectDB();

        console.log('1. Creating test document...');
        const doc = await TestModel.create({ name: 'FocusFlow DB Verification' });
        console.log('   Saved to MongoDB:', doc._id);

        console.log('2. Reading test document...');
        const foundDoc = await TestModel.findById(doc._id);
        console.log('   Retrieved:', foundDoc.name);

        console.log('3. Cleaning up test document...');
        await TestModel.findByIdAndDelete(doc._id);
        console.log('   Cleaned up test document.');

        console.log('\nSUCCESS: MongoDB Atlas read/write operations are working perfectly!');
        process.exit(0);
    } catch (err) {
        console.error('\nTest failed:', err.message);
        process.exit(1);
    }
};

runTest();