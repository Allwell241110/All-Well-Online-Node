const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const axios = require('axios');
const { getMomoToken } = require('../../utils/momoTokenManager');
const { isUser, isAdmin, isGuest } = require('../../middleware/auth');
const User = require('../../models/User');

const { sendFacebookEvent } = require('../../utils/facebookCapi'); // Adjust path as needed


// GET /orders — show list of orders
router.get('/', isGuest, async (req, res) => {
  try {
    const query = req.session.user.role === 'admin' ? {} : { userId: req.session.user._id };
    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.render('orders/orders', {
      title: req.user.role === 'admin' ? 'All Orders' : 'My Orders',
      orders
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching orders.');
  }
});

// GET /orders/:id
const logUserActivity = require('../../utils/logUserActivity');

router.get('/:id', isGuest, async (req, res) => {
  try {
    console.log('Fetching order ID:', req.params.id);
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      console.warn('Order not found:', req.params.id);
      return res.status(404).send('Order not found');
    }

    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userId = req.user ? req.user._id : null;
    console.log('Session ID:', sessionId);
    console.log('User ID:', userId);

    let user = null;
    if (userId) {
      user = await User.findById(userId).lean();
      console.log('User found:', user?.name);
    } else {
      user = {};
      console.log('User not logged in');
    }

    console.log('Logging user activity: viewed_order_details');
    await logUserActivity({
      userId,
      sessionId,
      activityType: 'viewed_order_details',
      pageUrl: req.originalUrl,
      referrer: req.get('Referrer') || '',
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip,
      metadata: { orderId: order._id, paymentStatus: order.paymentStatus }
    });
    console.log('Rendering order details page');
    res.render('orders/orderDetails', {
      title: 'Order Details',
      order,
    });

  } catch (err) {
    console.error('Error checking payment status:', err?.response?.data || err.message);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/:id/status', isAdmin, async (req, res) => {
  const { newStatus } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send('Order not found');

    order.status = newStatus;
    order.updatedAt = new Date();
    await order.save();

    res.redirect(`/orders/${order._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update order status');
  }
});

router.post('/:id/delete', isAdmin, async (req, res) => {
  const orderId = req.params.id;
  console.log(`Attempting to delete order with ID: ${orderId}`);

  try {
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (deletedOrder) {
      console.log(`Successfully deleted order: ${deletedOrder._id}`);
    } else {
      console.warn(`No order found with ID: ${orderId}`);
    }

    res.redirect('/orders');
    
  } catch (err) {
    console.error(`Error deleting order with ID ${orderId}:`, err);
    res.status(500).send('Failed to delete order');
  }
});

module.exports = router;