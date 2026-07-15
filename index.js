// 1. Express, Path & CORS library ko import karna
const express = require('express');
const path = require('path');
const cors = require('cors');

// Database config ko import karna
const db = require('./config/db');

// 2. Express ki app create karna
const app = express();

// 3. Port number define karna
const PORT = process.env.PORT || 5000;

// CORS Middleware (Frontend-Backend Communication ke liye)
app.use(cors());

// Middleware for JSON Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files serve karna (HTML/CSS/JS)
// 🔥 FIXED: index: false karne se auto index.html open hona band ho jata hai
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views'), { index: false }));

// Favicon 404 Error Ignore karne ke liye
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ==========================================
// 🎯 DEFAULT BASE ROUTE (LINK OPEN HO TO SEEDHA LOGIN CHALE)
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ==========================================
// API ROUTES SETUP
// ==========================================

// Auth Routes (Login & Register)
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes);

// Fuel Pricing Routes
const fuelRoutes = require('./routes/fuelRoutes');
app.use('/api/fuel', fuelRoutes);

// Meter Reading Routes
const meterRoutes = require('./routes/meterRoutes');
app.use('/api/meter', meterRoutes);

// Ledger Routes
const ledgerRoutes = require('./routes/ledgerRoutes');
app.use('/api/ledger', ledgerRoutes);

// Daily Sheet Routes
const dailySheetRoutes = require('./routes/dailySheetRoutes');
app.use('/api/daily-sheet', dailySheetRoutes);

// Dashboard API Routes
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

// Report API Routes
const reportRoutes = require('./routes/reportRoutes'); 
app.use('/api/report', reportRoutes);

// ==========================================
// HTML PAGE ROUTES (Views)
// ==========================================

// Login Page Route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Register Page Route
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Dashboard Page Route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Ledgers Page Route
app.get('/ledgers', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ledgers.html'));
});

// Report Page Route
app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'report.html'));
});

// ==========================================
// SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server is running on port: ${PORT}`);
    console.log(`=================================`);
});