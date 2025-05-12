const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  salePrice: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return v <= this.price;
      },
      message: 'Sale price must be less than or equal to price.'
    }
  },
  stock: Number,
  image: {
    url: String,
    deleteHash: String
  }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: {
    type: Number,
    required: function () {
      return this.variants.length === 0;
    }
  },
  salePrice: {
    type: Number,
    validate: {
      validator: function (v) {
        // Only validate if price exists and variants are not used
        return this.variants.length === 0 ? v <= this.price : true;
      },
      message: 'Sale price must be less than or equal to price.'
    }
  },
  brand: String,
  images: [{ url: String, deleteHash: String }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  stock: {
    type: Number,
    required: function () {
      return this.variants.length === 0;
    }
  },
  averageRating: Number,
  numReviews: Number,
  variants: [variantSchema]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);