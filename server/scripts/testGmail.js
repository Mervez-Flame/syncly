// Step 2 check: proves Google auth + Gmail access + email cleaning all work, with no AI or Calendar involved.
// Read-only: it does NOT mark anything as processed, so you can run it as many times as you like.
//
// Run from the server/ folder:
//   node scripts/testGmail.js                       (lists the users in your database)
//   node scripts/testGmail.js test.account@gmail.com
//   node scripts/testGmail.js test.account@gmail.com --max=5 --days=14 --full

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { google } = require('googleapis');
const User = require('../models/User');
const { getAuthedClient, ReauthRequiredError } = require('../utils/googleClient');
const { fetchUnprocessedEmails } = require('../services/gmailService');

function readFlag(name) {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split('=')[1] : undefined;
}

async function connectDatabase() {
    // Reuses your config/db.js. If it exports a function we call it;
    // if it connects as soon as it is required, we simply wait for that connection.
    const dbModule = require('../config/db');
    const connect = typeof dbModule === 'function' ? dbModule : (dbModule.connectDB || dbModule.connect);
    if (typeof connect === 'function') await connect();
    else await mongoose.connection.asPromise();
}

async function main() {
    await connectDatabase();

    const emailArg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;

    if (!emailArg) {
        const users = await User.find().select('email name').lean();
        console.log('\nUsers in the database:');
        users.forEach((u) => console.log(`  - ${u.email}`));
        console.log('\nRun again with one of those emails, e.g.  node scripts/testGmail.js <email>\n');
        return;
    }

    const user = await User.findOne({ email: emailArg });
    if (!user) throw new Error(`No user with email ${emailArg}. Sign in to the app with that account first.`);
    console.log(`\n1. User found: ${user.email}  (id ${user._id})`);

    // 2. Google token
    const auth = await getAuthedClient(user._id);
    console.log('2. Google refresh token works, access token obtained');

    // 3. Which Gmail account are we actually reading?
    const gmail = google.gmail({ version: 'v1', auth });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(`3. Gmail connected: ${profile.data.emailAddress}  (${profile.data.messagesTotal} messages in mailbox)`);

    // 4. The real pipeline step
    const options = {};
    if (readFlag('max')) options.maxEmails = parseInt(readFlag('max'), 10);
    if (readFlag('days')) options.windowDays = parseInt(readFlag('days'), 10);

    const started = Date.now();
    const { emails, remaining, stats } = await fetchUnprocessedEmails(auth, user._id, options);
    const seconds = ((Date.now() - started) / 1000).toFixed(2);

    console.log(`4. fetchUnprocessedEmails finished in ${seconds}s`);
    console.log('   stats    :', JSON.stringify(stats));
    console.log(`   returned : ${emails.length} email(s), remaining waiting: ${remaining}`);

    const showFull = process.argv.includes('--full');
    emails.forEach((e, i) => {
        console.log(`\n--- [${i + 1}] ${e.subject || '(no subject)'}`);
        console.log(`    from      : ${e.from}`);
        console.log(`    received  : ${e.receivedAt}`);
        console.log(`    body chars: ${e.body.length}${e.bodyTruncated ? ' (truncated)' : ''}${e.body.length === 0 ? '  <-- EMPTY BODY' : ''}`);
        console.log(showFull ? `    ----- body -----\n${e.body}\n    -----------------` : `    preview   : ${e.body.slice(0, 160).replace(/\n/g, ' ')}`);
    });

    if (emails.length === 0) {
        console.log('\nNo unread, unprocessed emails in the window. Send a few emails to this account (and do not open them) then run again.');
    }
    console.log('');
}

main()
    .catch((err) => {
        if (err instanceof ReauthRequiredError) {
            console.error('\nGoogle rejected the stored token. Sign out of the app, remove it at myaccount.google.com/permissions, sign in again, then rerun.\n');
        } else {
            console.error(`\nFAILED [${err.code || err.name}]: ${err.message}\n`);
        }
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });