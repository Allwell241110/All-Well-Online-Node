const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');

//static
router.get('/', (req, res) => {
  const cart = req.session.cart || [];

  res.render('cart', {
    title: 'Cart',
    cart
  });
});

// Add product to cart
router.post('/add', async (req, res) => {
  try {
    const { productId, variantId } = req.body;

    console.log('Received productId:', productId, 'variantId:', variantId);

    // Fetch the product from the database
    const product = await Product.findById(productId);
    if (!product) {
      console.error('Product not found:', productId);
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Product found:', product);

    // Default price and image
    let finalPrice = product.salePrice || product.price;
    let variantName = null;
    let image = product.images[0]?.url || '';
    let variantImage = null;

    // If variantId is provided, find the variant
    if (variantId && product.variants && product.variants.length > 0) {
      const selectedVariant = product.variants.find(v => v._id.toString() === variantId);
      if (!selectedVariant) {
        console.error('Variant not found:', variantId);
        return res.status(400).json({ message: 'Variant not found' });
      }

      console.log('Selected variant:', selectedVariant);

      // Use variant price or fallback
      finalPrice = selectedVariant.salePrice || selectedVariant.price || finalPrice;
      variantName = selectedVariant.name;

      // Use variant image if available
      if (selectedVariant.image.url) {
        image = selectedVariant.image.url;
        variantImage = selectedVariant.image.url;
      }

      console.log('Final price after variant:', finalPrice, 'Variant name:', variantName, 'Image:', image);
    } else {
      console.log('No variant selected, using default price and image.');
    }

    // Initialize cart if not present
    if (!req.session.cart) {
      req.session.cart = [];
      console.log('Cart initialized');
    }

    // Check if item already exists in the cart
    const existingIndex = req.session.cart.findIndex(item =>
      item.productId === productId &&
      item.variantId === (variantId || null)
    );

    if (existingIndex !== -1) {
      req.session.cart[existingIndex].quantity += 1;
      console.log('Item already in cart, incremented quantity');
    } else {
      req.session.cart.push({
        productId,
        variantId: variantId || null,
        variantName,
        name: product.name,
        price: finalPrice,
        quantity: 1,
        image,
        variantImage
      });
      console.log('New item added to cart:', req.session.cart);
    }

    res.status(200).json({ message: 'Product added to cart' });
  } catch (err) {
    console.error('Error in /add route:', err);
    res.status(500).json({ message: 'Server error while adding to cart' });
  }
});


router.post('/update', (req, res) => {
  const { productId, variantId, quantity } = req.body;

  if (!req.session.cart) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  // Normalize variantId to string or null for comparison
  const normalizedVariantId = variantId ? String(variantId) : null;

  const cartItem = req.session.cart.find(item =>
    item.productId === productId &&
    String(item.variantId) === String(normalizedVariantId)
  );

  if (!cartItem) {
    return res.status(404).json({ message: 'Product not found in cart' });
  }

  if (quantity <= 0) {
    req.session.cart = req.session.cart.filter(item =>
      !(item.productId === productId && String(item.variantId) === String(normalizedVariantId))
    );
    return res.status(200).json({ message: 'Item removed from cart' });
  } else {
    cartItem.quantity = quantity;
    return res.status(200).json({ message: 'Cart updated successfully' });
  }
});

// Remove product from cart
router.post('/remove', (req, res) => {
  const { productId, variantId } = req.body;

  if (!req.session.cart) {
    return res.redirect('/cart');
  }

  const normalizedVariantId = variantId ? String(variantId) : null;

  req.session.cart = req.session.cart.filter(item =>
    !(item.productId === productId && String(item.variantId) === String(normalizedVariantId))
  );

  res.redirect('/cart');
});

module.exports = router;