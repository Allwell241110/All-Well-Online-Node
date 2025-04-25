const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');

//static
router.get('/', (req, res) => {
  res.render('cart', {
    title: 'Cart'
  })
});

// Add product to cart
router.post('/add', async (req, res) => {
  try {
    const { productId } = req.body;

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Initialize cart if not present
    if (!req.session.cart) {
      req.session.cart = [];
    }

    // Check if product is already in the cart
    const existingIndex = req.session.cart.findIndex(item => item.productId === productId);

    if (existingIndex !== -1) {
      // If already in cart, increase quantity
      req.session.cart[existingIndex].quantity += 1;
    } else {
      // Otherwise, add new product
      req.session.cart.push({
        productId,
        name: product.name,
        price: product.salePrice || product.price,
        quantity: 1,
        image: product.images[0]?.url || ''
      });
    }

    res.status(200).json({ message: 'Product added to cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while adding to cart' });
  }
});


// Update product quantity in cart
router.post('/update', (req, res) => {
  const { productId, quantity } = req.body;

  if (!req.session.cart) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const cartItem = req.session.cart.find(item => item.productId === productId);

  if (!cartItem) {
    return res.status(404).json({ message: 'Product not found in cart' });
  }

  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    req.session.cart = req.session.cart.filter(item => item.productId !== productId);
    return res.status(200).json({ message: 'Item removed from cart' });
  } else {
    cartItem.quantity = quantity;
    return res.status(200).json({ message: 'Cart updated successfully' });
  }
});

// Remove product from cart
router.post('/remove', (req, res) => {
  const { productId } = req.body;

  if (!req.session.cart) {
    return res.redirect('/cart');
  }

  req.session.cart = req.session.cart.filter(item => item.productId !== productId);
  res.redirect('/cart');
});

module.exports = router;