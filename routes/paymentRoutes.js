// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/pay', paymentController.initiatePayment);
router.post('/mtn-callback', paymentController.handleMTNCallback); // For future use if MTN sends webhook

module.exports = router;
