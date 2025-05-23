// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  fbId: String,
  name: String,
  description: String,
  images: [String], // base64-encoded images
});

module.exports = mongoose.model('FacebookProduct', productSchema);