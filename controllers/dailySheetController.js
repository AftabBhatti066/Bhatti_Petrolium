const db = require('../config/db');

// 1. New customer registration (Filtered by user_id)
exports.addCustomer = async (req, res) => {
    try {
        const { customer_name, search_id, userId } = req.body;

        if (!customer_name || !search_id || !userId) {
            return res.status(400).json({ status: "Error", message: "Customer Name, Search ID aur User ID required hain!" });
        }

        const cleanSearchId = search_id.trim().toLowerCase();
        
        // Check if customer with same search ID exists FOR THIS USER
        const [existing] = await db.query(
            'SELECT id FROM daily_customers WHERE LOWER(search_id) = ? AND user_id = ?', 
            [cleanSearchId, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ status: "Error", message: "Yeh Search ID aap ke paas pehle se registered hai!" });
        }

        const query = `INSERT INTO daily_customers (customer_name, search_id, user_id) VALUES (?, ?, ?)`;
        await db.query(query, [customer_name.trim(), cleanSearchId, userId]);

        res.json({
            status: "Success",
            message: `Customer ${customer_name} added successfully!`
        });
    } catch (error) {
        console.error("Add Customer Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// 2. Bulk Batch Save Daily Sheet Entries (Filtered by user_id)
exports.saveDailySheetEntry = async (req, res) => {
    try {
        const entries = req.body.entries ? req.body.entries : [req.body];
        const mainUserId = req.body.userId; 

        if (!entries || entries.length === 0 || !mainUserId) {
            return res.status(400).json({ status: "Error", message: "Entries ya User ID nahi mili." });
        }

        for (const item of entries) {
            const { search_id, debit_udhaar, credit_vasooli, sheet_date, customer_name, userId } = item;
            const currentUserId = userId || mainUserId;

            if (!search_id || !sheet_date || !currentUserId) continue;

            const cleanSearchId = search_id.trim().toLowerCase();
            const debit = parseFloat(debit_udhaar) || 0;
            const credit = parseFloat(credit_vasooli) || 0;
            const total_balance = debit - credit;

            // Ensure customer entry exists in master customer list for this specific user
            if (customer_name) {
                await db.query(
                    `INSERT INTO daily_customers (customer_name, search_id, user_id) 
                     VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name)`,
                    [customer_name.trim(), cleanSearchId, currentUserId]
                );
            }

            // Check if sheet row already exists for this search_id, sheet_date AND user_id
            const [exists] = await db.query(
                'SELECT id FROM daily_sheets WHERE LOWER(search_id) = ? AND DATE(sheet_date) = DATE(?) AND user_id = ?',
                [cleanSearchId, sheet_date, currentUserId]
            );

            if (exists.length > 0) {
                // Update
                await db.query(
                    `UPDATE daily_sheets 
                     SET debit_udhaar = ?, credit_vasooli = ?, total_balance = ? 
                     WHERE id = ?`,
                    [debit, credit, total_balance, exists[0].id]
                );
            } else {
                // Insert
                await db.query(
                    `INSERT INTO daily_sheets (search_id, debit_udhaar, credit_vasooli, total_balance, sheet_date, user_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [cleanSearchId, debit, credit, total_balance, sheet_date, currentUserId]
                );
            }
        }

        res.json({
            status: "Success",
            message: "Daily Sheet entries successfully saved/updated!"
        });
    } catch (error) {
        console.error("Save Sheet Entry Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// 3. Fetch Daily Sheet By Date (Filtered by user_id)
exports.getDailySheetByDate = async (req, res) => {
    try {
        const { date } = req.params; 
        const userId = req.query.userId; // 🔥 Catch User ID filter

        if (!userId) {
            return res.status(400).json({ status: "Error", message: "User ID parameter missing!" });
        }

        const query = `
            SELECT 
                dc.customer_name, 
                dc.search_id, 
                COALESCE(ds.id, 0) AS id,
                COALESCE(ds.debit_udhaar, 0) AS debit_udhaar, 
                COALESCE(ds.credit_vasooli, 0) AS credit_vasooli, 
                COALESCE(ds.total_balance, 0) AS total_balance
            FROM daily_customers dc
            LEFT JOIN daily_sheets ds 
                ON LOWER(TRIM(dc.search_id)) = LOWER(TRIM(ds.search_id)) 
                AND DATE(ds.sheet_date) = DATE(?)
                AND ds.user_id = dc.user_id
            WHERE dc.user_id = ?
            ORDER BY dc.id ASC
        `;
        
        const [rows] = await db.query(query, [date, userId]);

        let total_debit = 0;
        let total_credit = 0;

        rows.forEach(entry => {
            total_debit += parseFloat(entry.debit_udhaar) || 0;
            total_credit += parseFloat(entry.credit_vasooli) || 0;
        });

        res.json({
            status: "Success",
            sheet_date: date,
            total_debit,
            total_credit,
            net_cash_income: total_credit,
            entries: rows
        });
    } catch (error) {
        console.error("Fetch Sheet Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// 4. Daily Sheet se Entry Delete karna
exports.deleteSheetEntry = async (req, res) => {
    try {
        const { id } = req.params;

        if (id == 0) {
            return res.json({ status: "Success", message: "Empty row ignored." });
        }

        await db.query('DELETE FROM daily_sheets WHERE id = ?', [id]);

        res.json({
            status: "Success",
            message: `Entry deleted successfully.`
        });
    } catch (error) {
        console.error("Delete Entry Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// 5. Customer ko Permanent Delete karna (Filtered by user_id)
exports.deleteCustomerPermanently = async (req, res) => {
    try {
        const { search_id } = req.params;
        const userId = req.query.userId; // 🔥 Secure validation

        if (!userId) {
            return res.status(400).json({ status: "Error", message: "User ID authorization fail!" });
        }

        const cleanSearchId = search_id.trim().toLowerCase();

        await db.query('DELETE FROM daily_sheets WHERE LOWER(search_id) = ? AND user_id = ?', [cleanSearchId, userId]);
        const [result] = await db.query('DELETE FROM daily_customers WHERE LOWER(search_id) = ? AND user_id = ?', [cleanSearchId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "Error", message: "Yeh Customer majood nahi hai ya aap authorized nahi hain!" });
        }

        res.json({
            status: "Success",
            message: `Customer permanent delete ho gaya.`
        });
    } catch (error) {
        console.error("Delete Customer Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};