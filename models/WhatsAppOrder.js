const mongoose = require('mongoose');

const WhatsAppOrderSchema = new mongoose.Schema({
  name: String,
  phone: String,
  district: String,
  quantity: Number,
  product: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
  },
  createdAt: Date,
});

module.exports = mongoose.model('WhatsAppOrder', WhatsAppOrderSchema);