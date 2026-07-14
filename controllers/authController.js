const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'bhatti_petrolium',
    waitForConnections: true,
    connectionLimit: 10
});

// 1. Register Function
const registerUser = async (req, res) => {
    const { fullName, username, password } = req.body;
    console.log("Register Request Received:", req.body);

    if (!fullName || !username || !password) {
        return res.status(400).json({ status: "Error", message: "Tamam fields required hain!" });
    }

    try {
        const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);

        if (existing.length > 0) {
            return res.status(400).json({ status: "Error", message: "Yeh Username pehle se maujood hai!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (full_name, username, password, role) VALUES (?, ?, ?, ?)',
            [fullName, username, hashedPassword, 'Manager']
        );

        console.log("User Insert Result:", result);
        return res.json({ status: "Success", message: "Manager account create ho gaya hai!" });
    } catch (err) {
        console.error("Database Insert Error:", err);
        return res.status(500).json({ status: "Error", message: "Database Error: " + err.message });
    }
};

// 2. Login Function
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: "Error", message: "Username aur Password dono zaroori hain!" });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ status: "Error", message: "Ghalat Username ya Password hai!" });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ status: "Error", message: "Ghalat Username ya Password hai!" });
        }

        return res.json({
            status: "Success",
            message: "Login successful",
            user: { id: user.id, name: user.full_name, role: user.role }
        });
    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ status: "Error", message: "Database Error!" });
    }
};

// Explicit Object Export
module.exports = {
    registerUser,
    loginUser
};