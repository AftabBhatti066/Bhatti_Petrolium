const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuelController');

router.get('/rates', fuelController.getFuelRates);
router.post('/update', fuelController.updateFuelRate);
router.delete('/delete/:id', fuelController.deleteFuelRate);

module.exports = router;