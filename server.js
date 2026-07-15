const express = require('express');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 FIXED: index: false karne se auto index.html open hona band ho jaye ga
app.use(express.static(__dirname, { index: false }));

// 🎯 Ab yeh route bilkul sahi kaam karega aur seedha login page kholega
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// API Routes
app.use('/api', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});