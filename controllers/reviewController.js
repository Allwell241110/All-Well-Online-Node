const Review = require('../models/review');
const updateProductRating = require('../utils/updateProductRating');

// Add or update review
exports.addOrUpdateReview = async (req, res) => {
  const { user, product, rating, comment } = req.body;

  try {
    const review = await Review.findOneAndUpdate(
      { user, product },
      { rating, comment },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await updateProductRating(product);
    res.status(200).json(review);
  } catch (err) {
    res.status(500).json({ error: 'Error submitting review' });
  }
};

// Get all reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name');

    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching reviews' });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  const { userId } = req.body;

  try {
    const deleted = await Review.findOneAndDelete({
      user: userId,
      product: req.params.productId
    });

    if (!deleted) return res.status(404).json({ message: 'Review not found' });

    await updateProductRating(req.params.productId);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting review' });
  }
};
