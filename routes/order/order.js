const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const axios = require('axios');
const { getMomoToken } = require('../../utils/momoTokenManager');
const { isUser, isAdmin, isGuest } = require('../../middleware/auth');

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
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).send('Order not found');

    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userId = req.user ? req.user._id : null;
    let user = null;
    if (userId) {
      user = await User.findById(userId).lean(); // optional `.lean()` for better performance
    } else {
      user = {};
    }

    // Log viewed order details
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

    // Only check MoMo status if prepaid and still not paid
    if (order.paymentMethod === 'prepaid' && order.paymentStatus !== 'Paid') {
      const latestTx = order.transactions?.[order.transactions.length - 1];
      if (latestTx && latestTx.status === 'Pending') {
        const accessToken = await getMomoToken();

        const response = await axios.get(
          `${process.env.MOMO_BASE_URL}/collection/v1_0/requesttopay/${latestTx.externalId}`,
          {
            headers: {
              'X-Target-Environment': process.env.TARGET_ENVIRONMENT,
              'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        const momoStatus = response.data.status; // 'SUCCESSFUL', 'FAILED', or 'PENDING'
        let paymentStatus = 'Unpaid';
        if (momoStatus === 'SUCCESSFUL') paymentStatus = 'Paid';
        else if (momoStatus === 'FAILED') paymentStatus = 'Failed';

        // Update order in DB
        await Order.updateOne(
          { _id: order._id, 'transactions.externalId': latestTx.externalId },
          {
            $set: {
              paymentStatus,
              'transactions.$.status': momoStatus === 'SUCCESSFUL' ? 'Successful' :
                                       momoStatus === 'FAILED' ? 'Failed' : 'Pending',
              transactionId: momoStatus === 'SUCCESSFUL' ? response.data.financialTransactionId : undefined
            }
          }
        );

        // Reload order with updated values
        Object.assign(order, {
          paymentStatus,
          transactionId: momoStatus === 'SUCCESSFUL' ? response.data.financialTransactionId : order.transactionId,
          transactions: order.transactions.map(tx =>
            tx.externalId === latestTx.externalId
              ? { ...tx, status: momoStatus }
              : tx
          )
        });

        // Log successful payment
        if (momoStatus === 'SUCCESSFUL') {
  await logUserActivity({
    userId,
    sessionId,
    activityType: 'successful_payment',
    pageUrl: req.originalUrl,
    referrer: req.get('Referrer') || '',
    userAgent: req.get('User-Agent') || '',
    ipAddress: req.ip,
    metadata: {
      orderId: order._id,
      amount: latestTx.amount,
      transactionId: response.data.financialTransactionId
    }
  });

  await sendFacebookEvent({
    eventName: 'Purchase',
    firstName: user.name,
    email: user.email,
    phone: user.phoneNumber,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    productId: (order.items || []).map(item => item.productId).join(','),
    productName: 'Order Checkout',
    price: Number(latestTx.amount),
    pixelId: process.env.FB_PIXEL_ID,
    accessToken: process.env.FB_CAPI_ACCESS_TOKEN,
    externalId: user._id,
    sourceUrl: req.originalUrl,
  });
}
      }
    }

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