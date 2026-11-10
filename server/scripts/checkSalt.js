// server/scripts/checkSalt.js   run with:  node scripts/checkSalt.js
require('dotenv').config();
const { generateDeterministicEventId } = require('../services/calendarService');

console.log('EVENT_ID_SALT =', JSON.stringify(process.env.EVENT_ID_SALT)); // should print "random"

const a = generateDeterministicEventId('test-user', 'test-message');
const b = generateDeterministicEventId('test-user', 'test-message');
console.log(a === b
    ? '❌ SALT NOT ACTIVE: the same ID came out twice'
    : '✅ SALT ACTIVE: two different IDs came out');