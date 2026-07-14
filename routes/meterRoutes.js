const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');

// URLs ko controller k functions k sath jorna
router.post('/add', meterController.addReading);
router.get('/all', meterController.getAllReadings);

router.get('/tank-stock', meterController.getTankStock);
router.post('/update-receipt', meterController.updateStockReceipt);


router.get('/lubricant-stock', meterController.getLubricantStock);
router.post('/update-lubricants', meterController.saveLubricantTransactions);

module.exports = router;