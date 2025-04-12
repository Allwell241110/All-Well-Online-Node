const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Get user's cart
router.get('/:userId', cartController.getCart);

// Add item to cart
router.post('/:userId/add', cartController.addToCart);

// Update quantity
router.put('/:userId/update', cartController.updateCartItem);

// Remove item
router.delete('/:userId/remove/:productId', cartController.removeCartItem);

// Clear cart
router.delete('/:userId/clear', cartController.clearCart);

module.exports = router;
