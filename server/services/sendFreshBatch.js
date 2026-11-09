require('dotenv').config();
const nodemailer = require('nodemailer');

const count = parseInt(process.argv[2], 10) || 5;
const batchTag = process.argv[3] || `RUN-${Date.now()}`;

// Pools for dynamic course code and title generation
const departments = ['CSC', 'MTH', 'PHY', 'ENG', 'GST', 'SEN', 'CYB'];
const assignmentTypes = [
    'Lab Report',
    'Coding Exercise',
    'Essay Submission',
    'Reading Summary',
    'Term Project Check-in',
    'Quiz Preparation',
    'Problem Set'
];

function generateUniqueEmail(index, tag) {
    // Generate realistic course codes (e.g., CSC 201, MTH 305)
    const dept = departments[index % departments.length];
    const codeNum = 200 + ((index * 13) % 200); // Creates unique numbers e.g. 213, 226, 301
    const courseCode = `${dept} ${codeNum}`;

    const assignmentType = assignmentTypes[index % assignmentTypes.length];
    const subject = `[${tag}] ${courseCode} ${assignmentType}`;

    // Generate realistic future due date
    const dueDate = new Date(Date.now() + (index + 2) * 86400000);
    const dateStr = dueDate.toISOString().split('T')[0];

    const body = `Dear Student,\n\nThis is an official task notification for ${courseCode} (${assignmentType}).\nYour submission is due on ${dateStr} at 23:59.\n\nPlease ensure your work is completed before the deadline.\n\nBest regards,\nDepartment of Computer Science`;

    return { subject, body };
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.TEST_GMAIL_USER,
        pass: process.env.TEST_GMAIL_APP_PASS
    }
});

async function sendFreshBatch() {
    console.log(`Generating and sending ${count} unique synthetic emails for batch [${batchTag}]...`);

    for (let i = 0; i < count; i++) {
        const emailData = generateUniqueEmail(i + 1, batchTag);

        await transporter.sendMail({
            from: `"Test Suite" <${process.env.TEST_GMAIL_USER}>`,
            to: process.env.TEST_GMAIL_USER,
            subject: emailData.subject,
            text: emailData.body
        });

        console.log(`  └─ Sent [${i + 1}/${count}]: ${emailData.subject}`);
        await new Promise((res) => setTimeout(res, 800)); // 800ms delay to prevent rate limits
    }

    console.log(`\n✅ Batch delivery complete. Tap Sync on your device now!`);
}

sendFreshBatch();