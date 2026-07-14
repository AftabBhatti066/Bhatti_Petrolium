const db = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        const selectedDate = req.query.date || new Date().toISOString().split('T')[0];

        // 1. Tank Fuel Stocks (Diesel & Super Current Fuel Levels)
        const [tankStocks] = await db.query(
            `SELECT fuel_type, current_stock FROM fuel_stocks`
        );

        // 2. Today's Nozzle Meter Readings & Fuel Dispensed Sales
        const [meterStats] = await db.query(
            `SELECT 
                fuel_type, 
                COALESCE(SUM(liters_sold), 0) AS total_liters_sold 
             FROM meter_readings 
             WHERE DATE(reading_date) = DATE(?)
             GROUP BY fuel_type`, [selectedDate]
        );

        // 3. Daily Sheet Financial Summary (Today's Total Udhaar & Vasooli)
        const [dailySheetStats] = await db.query(
            `SELECT 
                COALESCE(SUM(debit_udhaar), 0) AS total_today_udhaar,
                COALESCE(SUM(credit_vasooli), 0) AS total_today_vasooli
             FROM daily_sheets
             WHERE DATE(sheet_date) = DATE(?)`, [selectedDate]
        );

        // 4. Vehicle Credit Ledger Summary (Today's Logged Fuel Credit)
        const [creditLedgerStats] = await db.query(
            `SELECT 
                COALESCE(SUM(total_amount), 0) AS total_credit_sales_pkr,
                COALESCE(SUM(litres), 0) AS total_credit_litres
             FROM credit_ledgers
             WHERE DATE(entry_date) = DATE(?)`, [selectedDate]
        );

        // 5. Low Lubricant Stock Warning (Items with stock < 5)
        const [lowLubricants] = await db.query(
            `SELECT item_name, current_stock FROM lubricant_stocks WHERE current_stock <= 5 ORDER BY current_stock ASC`
        );

        // 6. Registered Customers Count
        const [customerCount] = await db.query(`SELECT COUNT(*) AS total FROM daily_customers`);

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