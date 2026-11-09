require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Forces Google DNS resolution

const mongoose = require('mongoose');

async function resetEnvironment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        await mongoose.connection.collection('tasks').deleteMany({});
        await mongoose.connection.collection('processedemails').deleteMany({});

        console.log('✅ Cleared tasks and processed_emails collections.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset failed:', err.message);
        process.exit(1);
    }
}

resetEnvironment();