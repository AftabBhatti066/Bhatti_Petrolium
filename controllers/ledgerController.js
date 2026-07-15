const db = require('../config/db');

// ==========================================
// 1. VEHICLE REGISTRATION (Step 1 - Filtered by user_id)
// ==========================================
exports.registerVehicle = async (req, res) => {
    try {
        const { gari_number, owner_name, contact_number, address, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ status: "Error", message: "User ID required hai!" });
        }

        const cleanGariNumber = gari_number.trim().toLowerCase();

        // Check if vehicle already registered FOR THIS USER
        const [existing] = await db.query(
            'SELECT id FROM vehicles WHERE LOWER(gari_number) = ? AND user_id = ?',
            [cleanGariNumber, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ status: "Error", message: "Yeh vehicle aap ke paas pehle se registered hai!" });
        }

        const query = `INSERT INTO vehicles (gari_number, owner_name, contact_number, address, user_id) VALUES (?, ?, ?, ?, ?)`;
        await db.query(query, [gari_number.trim(), owner_name, contact_number, address, userId]);

        res.json({
            status: "success",
            message: `Ledger of vehicle number ${gari_number} is successfully opened!`
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// ==========================================
// 2. DAILY CREDIT FUEL LOG (Step 2 - Filtered by user_id)
// ==========================================
exports.logCreditFuel = async (req, res) => {
    try {
        const { gari_number, driver_name, product, litres, entry_date, userId } = req.body;

        if (!gari_number || !product || !litres || !entry_date || !userId) {
            return res.status(400).json({ status: "Error", message: "Tamam fields samet User ID required hain!" });
        }

        // Rate fetch from fuel_rates for this specific user
        const [fuelRateResult] = await db.query(
            'SELECT rate_per_litre FROM fuel_rates WHERE (LOWER(product_name) LIKE ? OR LOWER(product_type) LIKE ?) AND user_id = ? ORDER BY id DESC LIMIT 1',
            [`%${product.trim().toLowerCase()}%`, `%${product.trim().toLowerCase()}%`, userId]
        );
        
        if (!fuelRateResult || fuelRateResult.length === 0) {
            return res.status(400).json({
                status: "Error",
                message: `${product} ka rate Pricing section mein set nahi hai! Pehle rate update karein.`
            });
        }

        const current_rate = parseFloat(fuelRateResult[0].rate_per_litre) || 0;
        const total_amount = parseFloat(litres) * current_rate;

        // Insert into credit_ledgers with user_id
        const insertQuery = `
            INSERT INTO credit_ledgers (gari_number, driver_name, product, litres, rate_pkr, total_amount, entry_date, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(insertQuery, [gari_number.trim(), driver_name, product, litres, current_rate, total_amount, entry_date, userId]);

        res.json({
            status: "Success",
            message: "Udhaar entry kamyabi se save ho gayi!",
            calculated_data: {
                gari: gari_number,
                litres: litres,
                rate: current_rate,
                total_amount: total_amount
            }
        });

    } catch (error) {
        console.error("Log Credit Fuel Error:", error);
        res.status(500).json({ status: "Error", message: "Database Error: " + error.message });
    }
};
// ==========================================
// 3. GARI KA LEDGER / TAMAM HISTORY FETCH KARNA (Filtered by user_id)
// ==========================================
exports.getVehicleLedger = async (req, res) => {
    try {
        const { gari_number } = req.params;
        const userId = req.query.userId; // 🔥 Get from query params

        if (!userId) {
            return res.status(400).json({ status: "Error", message: "User ID parameter missing!" });
        }

        let query = '';
        let queryParams = [];

        // Hum ne credit_ledgers ko vehicles table ke sath LEFT JOIN kar diya hai taakay Contact aur Address details bhi fetch hon
        if (!gari_number || gari_number === 'ALL') {
            query = `
                SELECT 
                    cl.*, 
                    v.contact_number AS contact_info, 
                    v.address 
                FROM credit_ledgers cl
                LEFT JOIN vehicles v 
                    ON LOWER(cl.gari_number) = LOWER(v.gari_number) AND cl.user_id = v.user_id
                WHERE cl.user_id = ? 
                ORDER BY cl.id DESC
            `;
            queryParams = [userId];
        } else {
            query = `
                SELECT 
                    cl.*, 
                    v.contact_number AS contact_info, 
                    v.address 
                FROM credit_ledgers cl
                LEFT JOIN vehicles v 
                    ON LOWER(cl.gari_number) = LOWER(v.gari_number) AND cl.user_id = v.user_id
                WHERE LOWER(cl.gari_number) LIKE LOWER(?) AND cl.user_id = ? 
                ORDER BY cl.id DESC
            `;
            queryParams = [`%${gari_number.trim()}%`, userId];
        }

        const [rows] = await db.query(query, queryParams);

        // Totals calculation
        let total_logged_fuel = 0;
        let total_credit_amount = 0;

        rows.forEach(entry => {
            total_logged_fuel += parseFloat(entry.litres || 0);
            total_credit_amount += parseFloat(entry.total_amount || 0);
        });

        res.json({
            status: "Success",
            total_logged_fuel: total_logged_fuel,
            total_credit_amount: total_credit_amount,
            history: rows
        });
    } catch (error) {
        console.error("Get Ledger Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};
// ==========================================
// 4. KISI SPECIFIC CREDIT ENTRY KO DELETE KARNA (Filtered by user_id)
// ==========================================
exports.deleteCreditEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId; // Security check

        if (!userId) {
            return res.status(400).json({ status: "Error", message: "User ID validation fail!" });
        }

        // Check if entry belongs to this user
        const [entryCheck] = await db.query('SELECT * FROM credit_ledgers WHERE id = ? AND user_id = ?', [id, userId]);
        
        if (entryCheck.length === 0) {
            return res.status(404).json({
                status: "Error",
                message: "Yeh entry pehle hi delete ho chuki hai ya aap authorized nahi hain."
            });
        }

        const deleteQuery = 'DELETE FROM credit_ledgers WHERE id = ? AND user_id = ?';
        await db.query(deleteQuery, [id, userId]);

        res.json({
            status: "Success",
            message: `Entry ID ${id} khate se kamyabi se khatam kar di gayi hai!`
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};