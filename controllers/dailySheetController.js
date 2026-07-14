const db = require('../config/db');

// 1. New customer registration
exports.addCustomer = async (req, res) => {
    try {
        const { customer_name, search_id } = req.body;

        if (!customer_name || !search_id) {
            return res.status(400).json({ status: "Error", message: "Customer Name aur Search ID required hain!" });
        }

        const cleanSearchId = search_id.trim().toLowerCase();
        const query = `INSERT INTO daily_customers (customer_name, search_id) VALUES (?, ?)`;
        await db.query(query, [customer_name.trim(), cleanSearchId]);

        res.json({
            status: "Success",
            message: `Customer ${customer_name} (${cleanSearchId}) added successfully!`
        });
    } catch (error) {
        console.error("Add Customer Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: "Error", message: "Yeh Search ID pehle se registered hai!" });
        }
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// 2. Bulk Batch Save Daily Sheet Entries (Duplicates Fix)
exports.saveDailySheetEntry = async (req, res) => {
    try {
        // Front-end se 'entries' array ya single entry dono support honge
        const entries = req.body.entries ? req.body.entries : [req.body];

        if (!entries || entries.length === 0) {
            return res.status(400).json({ status: "Error", message: "Koi entries nahi mili." });
        }

        for (const item of entries) {
            const { search_id, debit_udhaar, credit_vasooli, sheet_date, customer_name } = item;

            if (!search_id || !sheet_date) continue;

            const cleanSearchId = search_id.trim().toLowerCase();
            const debit = parseFloat(debit_udhaar) || 0;
            const credit = parseFloat(credit_vasooli) || 0;
            const total_balance = debit - credit;

            // Ensure customer exists in master customer list
            if (customer_name) {
                await db.query(
                    `INSERT INTO daily_customers (customer_name, search_id) 
                     VALUES (?, ?) 
                     ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name)`,
                    [customer_name.trim(), cleanSearchId]
                );
            }

            // Upsert: Search ID aur Date match hone par purana record update hoga, naya duplicate nahi banega
            const query = `
                INSERT INTO daily_sheets (search_id, debit_udhaar, credit_vasooli, total_balance, sheet_date) 
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    debit_udhaar = VALUES(debit_udhaar),
                    credit_vasooli = VALUES(credit_vasooli),
                    total_balance = VALUES(total_balance)
            `;

            await db.query(query, [cleanSearchId, debit, credit, total_balance, sheet_date]);
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

// 3. Rozana ki mukammal sheet fetch karna (Master + Entries)
exports.getDailySheetByDate = async (req, res) => {
    try {
        const { date } = req.params; // Format: YYYY-MM-DD

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
            ORDER BY dc.id ASC
        `;
        
        const [rows] = await db.query(query, [date]);

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

// 4. Daily Sheet se Entry Delete karna [X]
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

// 5. Customer ko Permanent Delete karna (With search_id)
exports.deleteCustomerPermanently = async (req, res) => {
    try {
        const { search_id } = req.params;
        const cleanSearchId = search_id.trim().toLowerCase();

        await db.query('DELETE FROM daily_sheets WHERE LOWER(search_id) = ?', [cleanSearchId]);
        const [result] = await db.query('DELETE FROM daily_customers WHERE LOWER(search_id) = ?', [cleanSearchId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "Error", message: "Yeh Customer / Search ID majood nahi hai!" });
        }

        res.json({
            status: "Success",
            message: `Customer (${cleanSearchId}) permanent delete ho gaya.`
        });
    } catch (error) {
        console.error("Delete Customer Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};