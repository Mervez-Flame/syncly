require('dotenv').config();
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');

// Parse CLI arguments: node scripts/seedTestEmails.js <startIndex> <count>
const startIndex = parseInt(process.argv[2], 10) || 0;
const count = parseInt(process.argv[3], 10) || 5;

// Load ground truth spreadsheet
const workbook = xlsx.readFile('./FocusFlow_Evaluation_Corpus_Ground_Truth.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const allEmails = xlsx.utils.sheet_to_json(sheet);

// Slice dataset for targeted batch delivery
const batch = allEmails.slice(startIndex, startIndex + count);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.TEST_GMAIL_USER,      // testuserfocusflow@gmail.com
        pass: process.env.TEST_GMAIL_APP_PASS  // Gmail App Password
    }
});

async function sendBatch() {
    if (batch.length === 0) {
        console.log('❌ No emails found in the specified range.');
        process.exit(1);
    }

    console.log(`Starting delivery of ${batch.length} email(s) (Rows ${startIndex + 1} to ${startIndex + batch.length})...`);

    for (const item of batch) {
        try {
            await transporter.sendMail({
                from: `"Test Suite" <${process.env.TEST_GMAIL_USER}>`,
                to: process.env.TEST_GMAIL_USER,
                subject: item.Subject,
                text: item.Body
            });
            console.log(`✅ Sent [${item.ID}]: ${item.Subject}`);
            // 1-second delay between emails to prevent rate limiting
            await new Promise(res => setTimeout(res, 1000));
        } catch (err) {
            console.error(`❌ Failed [${item.ID}]: ${err.message}`);
        }
    }
    console.log('Batch delivery complete.');
}

sendBatch();