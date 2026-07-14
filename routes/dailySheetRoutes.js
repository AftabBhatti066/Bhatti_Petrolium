const express = require('express');
const router = express.Router();
const dailySheetController = require('../controllers/dailySheetController');

// Customer registration
router.post('/customer', dailySheetController.addCustomer);

// Entry log karne ka route
router.post('/save', dailySheetController.saveDailySheetEntry);
// Date k mutabik poori sheet uthane ka route
router.get('/view/:date', dailySheetController.getDailySheetByDate);

// Entry delete karne ka route
// Customer ko Search ID ke zariye permanently delete karne ka route
router.delete('/delete-customer/:search_id', dailySheetController.deleteCustomerPermanently);
module.exports = router;