const db = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
        // 🔥 FIXED: Frontend se aane wali userId ko catch kiya
        const userId = req.query.userId; 

        if (!userId) {
            return res.status(400).json({ status: "Error", message: "User ID parameters mein zaroori hai!" });
        }

        // 1. Tank Fuel Stocks (Filtered by user_id)
        const [tankStocks] = await db.query(
            `SELECT fuel_type, current_stock FROM fuel_stocks WHERE user_id = ?`, [userId]
        );

        // 2. Today's Nozzle Meter Readings (Filtered by user_id)
        const [meterStats] = await db.query(
            `SELECT 
                fuel_type, 
                COALESCE(SUM(liters_sold), 0) AS total_liters_sold 
             FROM meter_readings 
             WHERE DATE(reading_date) = DATE(?) AND user_id = ?
             GROUP BY fuel_type`, [selectedDate, userId]
        );

        // 3. Daily Sheet Financial Summary (Filtered by user_id)
        const [dailySheetStats] = await db.query(
            `SELECT 
                COALESCE(SUM(debit_udhaar), 0) AS total_today_udhaar,
                COALESCE(SUM(credit_vasooli), 0) AS total_today_vasooli
             FROM daily_sheets
             WHERE DATE(sheet_date) = DATE(?) AND user_id = ?`, [selectedDate, userId]
        );

        // 4. Vehicle Credit Ledger Summary (Filtered by user_id)
        const [creditLedgerStats] = await db.query(
            `SELECT 
                COALESCE(SUM(total_amount), 0) AS total_credit_sales_pkr,
                COALESCE(SUM(litres), 0) AS total_credit_litres
             FROM credit_ledgers
             WHERE DATE(entry_date) = DATE(?) AND user_id = ?`, [selectedDate, userId]
        );

        // 5. Low Lubricant Stock Warning (Filtered by user_id)
        const [lowLubricants] = await db.query(
            `SELECT item_name, current_stock FROM lubricant_stocks WHERE current_stock <= 5 AND user_id = ? ORDER BY current_stock ASC`, [userId]
        );

        // 6. Registered Customers Count (Filtered by user_id)
        const [customerCount] = await db.query(`SELECT COUNT(*) AS total FROM daily_customers WHERE user_id = ?`, [userId]);

        // Format Matrix Table Data
        const meterMap = {};
        meterStats.forEach(row => {
            meterMap[row.fuel_type] = parseFloat(row.total_liters_sold) || 0;
        });

        res.json({
            status: "Success",
            date: selectedDate,
            stocks: tankStocks,
            financials: {
                today_udhaar: parseFloat(dailySheetStats[0].total_today_udhaar || 0),
                today_vasooli: parseFloat(dailySheetStats[0].total_today_vasooli || 0),
                today_credit_ledger_pkr: parseFloat(creditLedgerStats[0].total_credit_sales_pkr || 0),
                total_customers: customerCount[0].total
            },
            dispensed_fuel: {
                diesel: meterMap['Diesel'] || meterMap['HSD'] || 0,
                petrol: meterMap['Petrol'] || meterMap['Super'] || meterMap['PMG'] || 0
            },
            low_lubricants: lowLubricants
        });

    } catch (error) {
        console.error("Dashboard Analytics Error:", error);
        res.status(500).json({ status: "Error", message: error.message });
    }
};