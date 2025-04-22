const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  salePrice: Number,
  brand: String,
  images: [{ url: String, deleteHash: String }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  stock: Number,
  averageRating: Number,
  numReviews: Number,

  variants: [{
  name: String,              // e.g. "Red", "Large"
  priceAdjustment: Number,   // Optional
  stock: Number,             // Optional
  image: {
    url: String,
    deleteHash: String
  }
}]
}, { timestamps: true });

// Export the model
module.exports = mongoose.model('Product', productSchema);