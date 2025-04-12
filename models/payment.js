// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  method:     { type: String, enum: ['Cash on Delivery', 'MTN Mobile Money'], required: true },
  status:     { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
  amount:     { type: Number, required: true },
  referenceId:{ type: String }, // from MTN API
  phone:      { type: String }, // MTN number
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
