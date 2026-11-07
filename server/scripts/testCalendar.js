// server/scripts/testCalendar.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { getAuthedClient } = require('../utils/googleClient');
const { syncTaskToCalendar, generateDeterministicEventId } = require('../services/calendarService');
const { google } = require('googleapis');

// Provide a valid test user ID from your MongoDB database here:
const TEST_USER_ID = '6aeb4661e1b0ce85b8e224ad'; 

const mockTask = {
    userId: TEST_USER_ID,
    localTaskId: 'test-local-id-123',
    title: 'Final Defense Preparation',
    courseCode: 'CSC 499',
    description: 'Prepare presentation slides',
    dueDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
    hasDueTime: true,
    gmailMessageId: 'msg-calendar-test-001',
    emailSubject: 'Project Defense Schedule'
};

async function runTests() {
    await connectDB();
    
    if (TEST_USER_ID === 'PLACEHOLDER_USER_ID') {
        console.error('❌ Please replace TEST_USER_ID with a valid ObjectId from your Users collection.');
        process.exit(1);
    }

    try {
        console.log('\n--- 1. Authenticating ---');
        const auth = await getAuthedClient(TEST_USER_ID);
        console.log('✅ Google Auth successful');

        console.log('\n--- 2. First Sync (Should create event) ---');
        const res1 = await syncTaskToCalendar(auth, mockTask, 'Africa/Lagos');
        console.log('📦 Result 1:', res1);

        console.log('\n--- 3. Second Sync (Should return already_exists) ---');
        const res2 = await syncTaskToCalendar(auth, mockTask, 'Africa/Lagos');
        console.log('📦 Result 2:', res2);

        console.log('\n--- 4. Cleanup (Deleting event) ---');
        const calendar = google.calendar({ version: 'v3', auth });
        const eventId = generateDeterministicEventId(mockTask.userId.toString(), mockTask.gmailMessageId);
        await calendar.events.delete({ calendarId: 'primary', eventId });
        console.log(`✅ Deleted event: ${eventId}`);

        console.log('\n--- 5. Simulating Bad Token ---');
        const badAuth = await getAuthedClient(TEST_USER_ID);
        badAuth.setCredentials({ access_token: 'invalid_token' });
        
        console.log('Attempting sync with bad token (expect retries then sync_failed)...');
        const res3 = await syncTaskToCalendar(badAuth, mockTask, 'Africa/Lagos');
        console.log('📦 Result 3:', res3);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        mongoose.disconnect();
    }
}

runTests();