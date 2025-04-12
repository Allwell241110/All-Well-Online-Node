const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Create a new order
router.post('/', orderController.createOrder);

// Get all orders for a specific user
router.get('/user/:userId', orderController.getUserOrders);

// Get all orders (admin)
router.get('/', orderController.getAllOrders);

// Get one order by ID
router.get('/:orderId', orderController.getOrderById);

// Update order status (admin)
router.put('/:orderId', orderController.updateOrderStatus);

// Delete order (admin or for cleanup)
router.delete('/:orderId', orderController.deleteOrder);

module.exports = router;
