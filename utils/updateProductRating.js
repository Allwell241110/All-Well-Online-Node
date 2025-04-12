const Review = require('../models/review');
const Product = require('../models/product');

async function updateProductRating(productId) {
  const reviews = await Review.find({ product: productId });

  const numReviews = reviews.length;
  const averageRating = numReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews
    : 0;

  await Product.findByIdAndUpdate(productId, {
    averageRating: averageRating.toFixed(1),
    numReviews
  });
}

module.exports = updateProductRating;
