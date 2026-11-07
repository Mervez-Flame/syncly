require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { runEmailSync } = require('../services/syncPipeline');

// Replace this with the same valid test user ID used in testCalendar.js
const TEST_USER_ID = '6aeb4661e1b0ce85b8e224ad';

async function runTests() {
    await connectDB();

    if (TEST_USER_ID === 'PLACEHOLDER_USER_ID') {
        console.error('❌ Please replace TEST_USER_ID with a valid ObjectId from your Users collection.');
        process.exit(1);
    }

    try {
        console.log('\n--- Starting Sync Pipeline ---');
        console.log(`User ID: ${TEST_USER_ID}`);
        console.log('Fetching emails and processing...\n');

        const summary = await runEmailSync(TEST_USER_ID, { timezone: 'Africa/Lagos' });
        
        console.log('✅ Pipeline Completed!');
        console.log('\n--- Sync Summary ---');
        console.table(summary);

    } catch (error) {
        console.error('\n❌ Pipeline Failed:', error.message);
        if (error.code) console.error(`Error Code: ${error.code}`);
    } finally {
        mongoose.disconnect();
    }
}

runTests();