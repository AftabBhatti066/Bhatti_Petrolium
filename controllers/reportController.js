const db = require('../config/db');

// Controller Function (Filtered by user_id)
const getDailySummary = async (req, res) => {
    const { fromDate, toDate, userId } = req.query; // 🔥 userId query se extract ki

    if (!fromDate || !toDate) {
        return res.status(400).json({ status: "Error", message: "From Date aur To Date zaroori hain!" });
    }

    if (!userId) {
        return res.status(400).json({ status: "Error", message: "User ID parameter missing!" });
    }

    try {
        const query = `
            SELECT 
                sheet_date AS report_date,
                SUM(debit_udhaar) AS total_credit,
                SUM(credit_vasooli) AS total_debit
            FROM daily_sheets
            WHERE user_id = ? AND sheet_date BETWEEN ? AND ?
            GROUP BY sheet_date
            ORDER BY sheet_date ASC;
        `;

        // 🔥 Params array mein userId pehle pass kiya kyunki query mein user_id = ? pehle hai
        const [rows] = await db.execute(query, [userId, fromDate, toDate]);

        return res.json(rows);
    } catch (err) {
        console.error("Report Fetch Error:", err);
        return res.status(500).json({ status: "Error", message: "Database Error: " + err.message });
    }
};

// Explicit Module Export
module.exports = {
    getDailySummary
};