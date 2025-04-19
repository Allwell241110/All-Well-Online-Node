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
    type: { type: String }, // e.g. "Color", "Size"
    options: [{
      name: String,         // e.g. "Red", "Large"
      priceAdjustment: Number, // Optional
      stock: Number         // Optional: track per variant
    }]
  }]
}, { timestamps: true });