const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// POST - Create or update a review
router.post('/', reviewController.addOrUpdateReview);

// GET - All reviews for a product
router.get('/:productId', reviewController.getProductReviews);

// DELETE - Remove a review
router.delete('/:productId', reviewController.deleteReview);

module.exports = router;
