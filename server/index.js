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
app.use('/api/sync', require('./routes/sync'));

// Unknown routes: answer in JSON, never HTML
app.use((req, res) => {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        code: 'NOT_FOUND'
    });
});

// Errors thrown outside a route's try/catch: also JSON
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Server error',
        code: 'SERVER_ERROR'
    });
});

// Start Server Listener
const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`FocusFlow Server running on port ${PORT}`);
});