// models/DeliveryAddress.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const deliveryAddressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  district: { type: String, required: true },
  village: { type: String },
  street: { type: String },
}, {
  timestamps: true
});

module.exports = mongoose.model('DeliveryAddress', deliveryAddressSchema);