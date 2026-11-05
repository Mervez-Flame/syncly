require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize Express Application
const app = express();

// Middleware Setup
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Mount Route Handlers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// Start Server Listener
const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`FocusFlow Server running on port ${PORT}`);
});