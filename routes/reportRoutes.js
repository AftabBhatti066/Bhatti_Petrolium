const express = require('express');
const router = express.Router();

// Direct destructured import
const { getDailySummary } = require('../controllers/reportController');

// Route setup
router.get('/daily-summary', getDailySummary);

module.exports = router;