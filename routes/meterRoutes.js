const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');

// URLs ko controller k functions k sath jorna
router.post('/add', meterController.addReading);
router.get('/all', meterController.getAllReadings);

router.get('/tank-stock', meterController.getTankStock);
// 🔥 Sahi function name map kar diya: updateReceipt
router.post('/update-receipt', meterController.updateReceipt);

router.get('/lubricant-stock', meterController.getLubricantStock);
// 🔥 Sahi function name map kar diya: updateLubricants
router.post('/update-lubricants', meterController.updateLubricants);

module.exports = router;