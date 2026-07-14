const db = require('../config/db');

// Get all price history sorted by date
exports.getFuelRates = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM fuel_rates ORDER BY rate_date DESC, id DESC');
        res.json({
            status: "Success",
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error("Fetch Rates Error:", error);
        res.status(500).json({ status: "Error", message: "Database se rates fetch nahi ho sake." });
    }
};

// Insert or Update Fuel & Mobil Oil Rates
exports.updateFuelRate = async (req, res) => {
    try {
        const { rate_date, product_name, product_type, specific_category, rate_per_litre } = req.body;

        if (!rate_date || !product_name || !rate_per_litre) {
            return res.status(400).json({ status: "Error", message: "Tamam fields required hain!" });
        }

        const query = `
            INSERT INTO fuel_rates (rate_date, product_name, product_type, specific_category, rate_per_litre) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await db.query(query, [rate_date, product_name, product_type, specific_category, parseFloat(rate_per_litre)]);

        res.json({
            status: "Success",
            message: `${product_name} ka rate Rs. ${rate_per_litre} save ho gaya!`
        });
    } catch (error) {
        console.error("Update Rate Error:", error);
        res.status(500).json({ status: "Error", message: "Database saving error: " + error.message });
    }
};

// Delete Rate Entry
exports.deleteFuelRate = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM fuel_rates WHERE id = ?', [id]);

        res.json({
            status: "Success",
            message: "Price log entry successfully delete ho gayi!"
        });
    } catch (error) {
        console.error("Delete Rate Error:", error);
        res.status(500).json({ status: "Error", message: "Delete karne mein error aaya." });
    }
};