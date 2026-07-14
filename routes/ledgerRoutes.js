

const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');
// Gari registration route
router.post('/register', ledgerController.registerVehicle);

// Daily fuel entry route
router.post('/log-fuel', ledgerController.logCreditFuel);

// Kisi specific gari ki ledger report dekhne ka route
router.get('/report/:gari_number', ledgerController.getVehicleLedger);

// Credit entry delete karne ka route (id k sath)
router.delete('/delete/:id', ledgerController.deleteCreditEntry);



module.exports = router;


