// Master Fetch: Database ke tamam registered customers + specific date ki entries
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