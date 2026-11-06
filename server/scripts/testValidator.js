// server/scripts/testValidator.js
const { validateExtractedTask } = require('../services/taskValidator');

const context = {
    emailReceivedAt: '2026-11-09T10:00:00Z',
    timezone: 'Africa/Lagos'
};

const testCases = [
    {
        name: 'Perfect Timed Task',
        input: { title: 'Final Project', courseCode: 'csc401', description: 'Submit it', dueDate: '2026-11-18', dueTime: '23:59' }
    },
    {
        name: 'Date Only Task',
        input: { title: 'Read Chapter 4', courseCode: 'N/A', description: 'null', dueDate: '2026-11-18', dueTime: null }
    },
    {
        name: 'String Null from LLM',
        input: { title: 'Pop Quiz', courseCode: 'GST101', description: 'Quiz tomorrow', dueDate: '2026-11-10', dueTime: 'null' }
    },
    {
        name: 'Date in the Past (Should Drop Date)',
        input: { title: 'Old Assignment', courseCode: 'PHY 101', description: '', dueDate: '2026-10-01', dueTime: '12:00' }
    },
    {
        name: 'Date Today without time (Should Keep Date)',
        input: { title: 'Submit document', courseCode: '', description: '', dueDate: '2026-11-09', dueTime: '' }
    },
    {
        name: 'Missing Title (Should Fail)',
        input: { title: '   ', courseCode: 'MTH 202', description: '', dueDate: '2026-11-20', dueTime: '09:00' }
    }
];

console.log('Starting Validator Tests\n--------------------------------------------------');
testCases.forEach((tc) => {
    console.log(`Testing: ${tc.name}`);
    const result = validateExtractedTask(tc.input, context);
    console.log(`📦 Result:`, JSON.stringify(result, null, 2));
    console.log('');
});
console.log('Done.');