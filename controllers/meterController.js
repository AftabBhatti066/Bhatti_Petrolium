const db = require('../config/db');

exports.addReading = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { nozzle_name, fuel_type, closing_reading, reading_date } = req.body;

        // 1. Pehle nozzle ki purani reading lein
        const [lastReading] = await connection.query(
            'SELECT closing_reading FROM meter_readings WHERE TRIM(LOWER(nozzle_name)) = TRIM(LOWER(?)) ORDER BY id DESC LIMIT 1',
            [nozzle_name]
        );
        
        let opening_reading = 0;
        if (lastReading.length > 0) {
            opening_reading = parseFloat(lastReading[0].closing_reading);
        }

        const liters_sold = parseFloat(closing_reading) - opening_reading;

        if (liters_sold < 0) {
            await connection.rollback();
            return res.status(400).json({
                status: "Error",
                message: `Closing reading (${closing_reading}) cannot be less than opening reading (${opening_reading})`
            });
        }

        // 2. Meter reading records update
        const insertQuery = `INSERT INTO meter_readings (nozzle_name, fuel_type, opening_reading, closing_reading, liters_sold, reading_date) 
                             VALUES (?, ?, ?, ?, ?, ?)`;
        await connection.query(insertQuery, [nozzle_name, fuel_type, opening_reading, closing_reading, liters_sold, reading_date]);

        // 3. Stock Update with Row Level Lock (Case-Insensitive match)
        const [stockRow] = await connection.query(
            `SELECT current_stock FROM fuel_stocks WHERE TRIM(LOWER(fuel_type)) = TRIM(LOWER(?)) FOR UPDATE`,
            [fuel_type]
        );

        if (stockRow.length > 0) {
            const updateStockQuery = `UPDATE fuel_stocks SET current_stock = current_stock - ? WHERE TRIM(LOWER(fuel_type)) = TRIM(LOWER(?))`;
            await connection.query(updateStockQuery, [liters_sold, fuel_type]);
        }

        await connection.commit();
        res.json({
            status: "Success",
            message: "Reading saved and stock deducted successfully!",
            data: { nozzle: nozzle_name, sold_liters: liters_sold }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Backend Error:", error);
        res.status(500).json({ status: "Error", message: "Database level error", db_error: error.message });
    } finally {
        if (connection) connection.release(); // Connection leak protection lock
    }
};

exports.getTankStock = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT fuel_type, current_stock FROM fuel_stocks');
        console.log("Terminal Debug DB Stock Data:", rows);
        res.json({ status: "Success", data: rows });
    } catch (error) {
        console.error("Stock fetch error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

exports.getAllReadings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM meter_readings ORDER BY id DESC');
        res.json({ status: "Success", data: rows });
    } catch (error) {
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

exports.updateStockReceipt = async (req, res) => {
    try {
        const { fuel_type, receipt_liters } = req.body;
        const query = `UPDATE fuel_stocks SET current_stock = current_stock + ? WHERE TRIM(LOWER(fuel_type)) = TRIM(LOWER(?))`;
        await db.query(query, [receipt_liters, fuel_type]);
        res.json({ status: "Success", message: "Stock receipt added successfully!" });
    } catch (error) {
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};


// Lubricant Stock fetch karne k liye
exports.getLubricantStock = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT item_name, current_stock FROM lubricant_stocks ORDER BY id ASC');
        res.json({ status: "Success", data: rows });
    } catch (error) {
        res.status(500).json({ status: "Error", db_error: error.message });
    }
};

// Lubricants Shift closing data batch update karne k liye (Transaction Safe)
exports.saveLubricantTransactions = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { lubricant_sales, lubricant_receipts } = req.body;

        // 1. Sales process karen (Minus from stock)
        for (const item of lubricant_sales) {
            if (item.qty > 0) {
                await connection.query(
                    `UPDATE lubricant_stocks SET current_stock = current_stock - ? WHERE item_name = ?`,
                    [item.qty, item.name]
                );
            }
        }

        // 2. Receipts process karen (Plus into stock)
        for (const item of lubricant_receipts) {
            if (item.qty > 0) {
                await connection.query(
                    `UPDATE lubricant_stocks SET current_stock = current_stock + ? WHERE item_name = ?`,
                    [item.qty, item.name]
                );
            }
        }

        await connection.commit();
        res.json({ status: "Success", message: "Lubricant inventory updated successfully!" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Lubricant Sync Error:", error);
        res.status(500).json({ status: "Error", db_error: error.message });
    } finally {
        if (connection) connection.release();
    }
};