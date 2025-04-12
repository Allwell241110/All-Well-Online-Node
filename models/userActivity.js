// models/UserActivity.js
const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type:     { type: String, required: true }, // e.g., 'login', 'view_product', 'add_to_cart'
  productId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  metadata: { type: Object }, // e.g., browser, IP address, device
  timestamp:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('UserActivity', userActivitySchema);
