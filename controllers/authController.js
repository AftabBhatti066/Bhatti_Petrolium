// Centralized DB config import karein taakay double pools na banein aur connections control mein rahein
const db = require('../config/db'); 
const bcrypt = require('bcrypt');

// 1. Register Function (With Automatic Stock Initialization for All 9 Lubricants & Fuels)
const registerUser = async (req, res) => {
    const { fullName, username, password } = req.body;
    console.log("Register Request Received:", req.body);

    if (!fullName || !username || !password) {
        return res.status(400).json({ status: "Error", message: "Tamam fields required hain!" });
    }

    try {
        // Checking if user already exists
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);

        if (existing.length > 0) {
            return res.status(400).json({ status: "Error", message: "Yeh Username pehle se maujood hai!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // User insert kiya
        const [result] = await db.query(
            'INSERT INTO users (full_name, username, password, role) VALUES (?, ?, ?, ?)',
            [fullName, username, hashedPassword, 'Manager']
        );

        console.log("User Insert Result:", result);
        
        // Naye user ki unique ID extract ki
        const newUserId = result.insertId;

        // 🚀 A. Automatic Fuel Stock Initialize karna (Default 0.00 stock)
        const fuelQuery = `
            INSERT INTO fuel_stocks (fuel_type, current_stock, user_id) 
            VALUES 
            ('Diesel', 0.00, ?),
            ('Super', 0.00, ?)
        `;
        await db.query(fuelQuery, [newUserId, newUserId]);

        // 🚀 B. Automatic Lubricant Stock Initialize karna (All 9 items)
        const lubricantQuery = `
            INSERT INTO lubricant_stocks (item_name, current_stock, user_id) 
            VALUES 
            ('T 2 20Ltrs', 0, ?),
            ('Balize .75', 0, ?),
            ('Balize 1Ltrs', 0, ?),
            ('Cariant 3Ltrs', 0, ?),
            ('Cariant 4ltrs', 0, ?),
            ('Deo 6000 4Ltrs', 0, ?),
            ('Deo 6000 10Ltrs', 0, ?),
            ('Deo 8000 4Ltrs', 0, ?),
            ('Deo 8000 10Ltrs', 0, ?)
        `;
        
        // passes newUserId 9 times for the 9 placeholders (?)
        await db.query(lubricantQuery, [
            newUserId, newUserId, newUserId, 
            newUserId, newUserId, newUserId, 
            newUserId, newUserId, newUserId
        ]);

        console.log(`All 9 stocks initialized automatically for User ID: ${newUserId}`);

        return res.json({ status: "Success", message: "Manager account aur default stocks create ho gaye hain!" });
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
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

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