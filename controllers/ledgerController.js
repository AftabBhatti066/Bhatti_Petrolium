const db = require('../config/db');

// ==========================================
// 1. VEHICLE REGISTRATION (Step 1)
// ==========================================
exports.registerVehicle = async (req, res) => {
    try {
        const { gari_number, owner_name, contact_number, address } = req.body;

        // Address k spellings database table k mutabik clear kar diye
        const query = `INSERT INTO vehicles (gari_number, owner_name, contact_number, address) VALUES (?, ?, ?, ?)`;
        await db.query(query, [gari_number, owner_name, contact_number, address]);

        res.json({
            status: "success",
            message: `Ledger of vehicle number ${gari_number} is successfully opened!`
        });
    } catch (error) {
        console.log(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: "Error", message: "Vehicle is already registered!" });
        }
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// ==========================================
// 2. DAILY CREDIT FUEL LOG (Step 2)
// ==========================================
exports.logCreditFuel = async (req, res) => {
    try {
        const { gari_number, driver_name, product, litres, entry_date } = req.body;

        if (!gari_number || !product || !litres || !entry_date) {
            return res.status(400).json({ status: "Error", message: "Tamam fields required hain!" });
        }

        // Rate fetch from fuel_rates using 'product_name' or 'product_type'
        // Updated column name: rate_per_litre
        const [fuelRateResult] = await db.query(
            'SELECT rate_per_litre FROM fuel_rates WHERE LOWER(product_name) LIKE ? OR LOWER(product_type) LIKE ? ORDER BY id DESC LIMIT 1',
            [`%${product.trim().toLowerCase()}%`, `%${product.trim().toLowerCase()}%`]
        );
        
        if (!fuelRateResult || fuelRateResult.length === 0) {
            return res.status(400).json({
                status: "Error",
                message: `${product} ka rate Pricing section mein set nahi hai! Pehle rate update karein.`
            });
        }

        const current_rate = parseFloat(fuelRateResult[0].rate_per_litre) || 0;
        const total_amount = parseFloat(litres) * current_rate;

        // Insert into credit_ledgers
        const insertQuery = `
            INSERT INTO credit_ledgers (gari_number, driver_name, product, litres, rate_pkr, total_amount, entry_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(insertQuery, [gari_number, driver_name, product, litres, current_rate, total_amount, entry_date]);

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
// 3. GARI KA LEDGER / TAMAM HISTORY FETCH KARNA
// ==========================================
exports.getVehicleLedger = async (req, res) => {
    try {
        const { gari_number } = req.params;

        let query = '';
        let queryParams = [];

        // Agar 'ALL' manga gaya ho ya blank ho to SAARE records le aao
        if (!gari_number || gari_number === 'ALL') {
            query = 'SELECT * FROM credit_ledgers ORDER BY id DESC';
        } else {
            query = 'SELECT * FROM credit_ledgers WHERE LOWER(gari_number) LIKE LOWER(?) ORDER BY id DESC';
            queryParams = [`%${gari_number.trim()}%`];
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
// 4. KISI SPECIFIC CREDIT ENTRY KO DELETE KARNA
// ==========================================
exports.deleteCreditEntry = async (req, res) => {
    try {
        const { id } = req.params;

        // Pehle check karte hain k kya yeh entry sach mein majood hai?
        const [entryCheck] = await db.query('SELECT * FROM credit_ledgers WHERE id = ?', [id]);
        
        if (entryCheck.length === 0) {
            return res.status(404).json({
                status: "Error",
                message: "Yeh entry pehle hi delete ho chuki hai ya majood nahi hai."
            });
        }

        // Entry ko delete karne ki query
        const deleteQuery = 'DELETE FROM credit_ledgers WHERE id = ?';
        await db.query(deleteQuery, [id]);

        res.json({
            status: "Success",
            message: `Entry ID ${id} khate sa kamyabi sa khatam kar di gayi hai!`
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};