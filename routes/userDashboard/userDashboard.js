const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const User = require('../../models/User');

const WhatsAppOrder = require('../../models/WhatsAppOrder');
const UserActivity = require('../../models/UserActivity');
const Product = require('../../models/Product');

const { isUser, isAdmin, isGuest } = require('../../middleware/auth');

router.get('/', isGuest, async (req, res) => {
  try {
    const user = req.session.user;

    // Fetch regular orders
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });

    // Fetch all 'viewed_product' activities sorted by newest
    const activities = await UserActivity.find({
      userId: user._id,
      activityType: 'viewed_product'
    }).sort({ createdAt: -1 });

    // Collect up to 5 unique product IDs
    const seenProductIds = new Set();
    const uniqueProductIds = [];

    for (const activity of activities) {
      const { productId } = activity.metadata;
      if (!seenProductIds.has(productId)) {
        seenProductIds.add(productId);
        uniqueProductIds.push(productId);
        if (uniqueProductIds.length === 5) break;
      }
    }

    // Fetch full product documents
    const products = await Product.find({ _id: { $in: uniqueProductIds } });

    // Maintain original order
    const productMap = {};
    products.forEach(p => productMap[p._id.toString()] = p);
    const viewedProducts = uniqueProductIds.map(id => productMap[id.toString()]).filter(Boolean);

    // Fetch WhatsApp orders using phone number
    const whatsappOrders = await WhatsAppOrder.find({ phone: user.phoneNumber }).sort({ createdAt: -1 });

    // Render dashboard
    res.render('dashboards/user', {
      title: 'Dashboard',
      user,
      orders,
      viewedProducts,
      whatsappOrders
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load dashboard');
  }
});

module.exports = router;