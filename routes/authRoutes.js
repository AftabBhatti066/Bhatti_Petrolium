const express = require('express');
const router = express.Router();



// Controller Functions Import
const { registerUser, loginUser } = require('../controllers/authController');

// Routes Definition
router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;