require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Middleware initialization
app.use(cors());
app.use(express.json());
connectDB();
