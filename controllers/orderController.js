const Order = require('../models/order');
const Cart = require('../models/cart');

// CREATE a new order
exports.createOrder = async (req, res) => {
  const { user, items, totalAmount, paymentMethod, shippingAddress } = req.body;

  try {
    const order = await Order.create({
      user,
      items,
      totalAmount,
      paymentMethod,
      shippingAddress,
      status: 'Pending'
    });

    // Optional: clear cart after order
    await Cart.findOneAndUpdate({ user }, { items: [] });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).send('Error creating order');
  }
};

// GET all orders for a user
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId }).populate('items.product');
    res.json(orders);
  } catch (err) {
    res.status(500).send('Error fetching user orders');
  }
};

// GET all orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('user').populate('items.product');
    res.json(orders);
  } catch (err) {
    res.status(500).send('Error fetching orders');
  }
};

// GET order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.product');
    if (!order) return res.status(404).send('Order not found');
    res.json(order);
  } catch (err) {
    res.status(500).send('Error fetching order');
  }
};

// UPDATE order status
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).send('Order not found');
    res.json(order);
  } catch (err) {
    res.status(500).send('Error updating order');
  }
};

// DELETE order
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.orderId);
    if (!deleted) return res.status(404).send('Order not found');
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).send('Error deleting order');
  }
};
