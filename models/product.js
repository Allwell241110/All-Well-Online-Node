// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  price:       { type: Number, required: true },
  salePrice:   { type: Number }, // optional, used if there's a discount
  brand:       { type: String },
  images: [
    {
      url: String,
      deleteHash: String
    }
  ],  
  category:    { type: String },
  stock:       { type: Number, default: 0 },
  averageRating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  }
  
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
