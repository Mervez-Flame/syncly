// server/scripts/testPipeline.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { runEmailSync } = require('../services/syncPipeline');

const TEST_USER_ID = process.env.TEST_USER_ID || '6aeb4661e1b0ce85b8e224ad';
const MAX_SCANS = 5; // safety stop so a stuck email can never loop forever

const scans = [];

function printTotals() {
    if (!scans.length) return;
    const keys = ['scanned', 'noTask', 'invalid', 'tasksCreated', 'synced', 'alreadyExists',
        'unscheduled', 'syncFailed', 'aiErrors', 'retried', 'durationMs'];
    const totals = { scan: 'TOTAL' };
    for (const k of keys) totals[k] = scans.reduce((s, x) => s + (x[k] || 0), 0);
    console.log('\n--- All scans so far ---');
    console.table([...scans, totals]);
    if (totals.scanned) {
        console.log(`Average time per scanned email: ${(totals.durationMs / totals.scanned).toFixed(0)} ms`);
    }
}

// Ctrl+C no longer loses everything: results already saved in MongoDB stay saved,
// and this prints what finished before you stopped it.
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Stopped early. Emails already processed are saved in the database.');
    printTotals();
    console.log('Run this script again to carry on, then run evaluate.js.');
    process.exit(1);
});

async function runTests() {
    await connectDB();

    try {
        console.log('\n--- Starting Sync Pipeline ---');
        console.log(`User ID: ${TEST_USER_ID}`);

        for (let i = 1; i <= MAX_SCANS; i++) {
            console.log(`\nScan ${i}...`);
            const summary = await runEmailSync(TEST_USER_ID, { timezone: 'Africa/Lagos' });
            scans.push({ scan: i, ...summary });
            console.table([summary]);

            // Done when nothing was scanned, or nothing is waiting and nothing needs a retry
            if (summary.scanned === 0) break;
            if (summary.remaining === 0 && summary.aiErrors === 0) break;
        }

        console.log('✅ Pipeline Completed!');
        printTotals();
        console.log('\nNext step: node scripts/evaluate.js');
    } catch (error) {
        console.error('\n❌ Pipeline Failed:', error.message);
        if (error.code) console.error(`Error Code: ${error.code}`);
        printTotals();
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
