require('dotenv').config();
const { extractTaskFromEmail } = require('../services/aiExtractor');
const emails = require('./fixtures/sampleEmails.json');

// Simple argument parser for --model and --effort
const args = process.argv.slice(2);
const options = {};
args.forEach(arg => {
    if (arg.startsWith('--model=')) options.model = arg.split('=')[1];
    if (arg.startsWith('--effort=')) options.effort = arg.split('=')[1];
});

async function runTests() {
    console.log(`Starting Extractor Tests (Model: ${options.model || 'default'}, Effort: ${options.effort || 'default'})`);
    console.log('--------------------------------------------------');

    for (const email of emails) {
        console.log(`\nTesting Email: "${email.subject}"`);
        try {
            const result = await extractTaskFromEmail(email, {
                timezone: 'Africa/Lagos',
                model: options.model,
                effort: options.effort
            });
            console.log(`⏱️  Latency: ${result.meta.latencyMs}ms | Tokens: ${result.meta.tokens}`);
            console.log(`📦 Result:`, JSON.stringify(result.task, null, 2));
        } catch (err) {
            console.error(`❌ Error: ${err.message}`);
            if (err.isFatal) console.error('   FATAL ERROR FLAG SET');
        }
    }
    console.log('\n--------------------------------------------------');
    console.log('Done.');
}

runTests();