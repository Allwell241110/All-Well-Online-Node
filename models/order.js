// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items:   [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number },
      price:    { type: Number } // snapshot of product price at time of order
    }
  ],
  total:   { type: Number },
  status:  { type: String, default: 'Pending' }, // 'Pending', 'Shipped', 'Delivered'
  shippingAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
