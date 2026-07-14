const express = require('express');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 YEH LINE ADD KAREIN: 
// Agar aap ki HTML files root folder mein hain:
app.use(express.static(__dirname));

// Ya agar aap ki HTML files 'views' folder ke andar hain, to yeh line use karein:
// app.use(express.static(path.join(__dirname, 'views')));

// API Routes
app.use('/api', authRoutes);

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});