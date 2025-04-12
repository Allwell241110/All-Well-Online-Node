const Cart = require('../models/cart');
const Product = require('../models/product');

// GET cart for user
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product');
    if (!cart) return res.json({ items: [] }); // Empty cart
    res.json(cart);
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// POST add to cart
exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.params.userId;

  try {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(item => item.product.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).send('Error adding to cart');
  }
};

// PUT update item quantity
exports.updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.params.userId;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).send('Cart not found');

    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) return res.status(404).send('Product not in cart');

    item.quantity = quantity;
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).send('Error updating cart');
  }
};

// DELETE remove product
exports.removeCartItem = async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).send('Cart not found');

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).send('Error removing item');
  }
};

// DELETE clear cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.params.userId }, { items: [] });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).send('Error clearing cart');
  }
};
