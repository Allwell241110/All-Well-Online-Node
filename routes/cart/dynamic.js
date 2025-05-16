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


const logUserActivity = require('../../utils/logUserActivity');
// Add product to cart
router.post('/add', async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userId = req.user ? req.user._id : null;

    console.log('Received productId:', productId, 'variantId:', variantId);

    const product = await Product.findById(productId);
    if (!product) {
      console.error('Product not found:', productId);
      return res.status(404).json({ message: 'Product not found' });
    }

    let finalPrice = product.salePrice || product.price;
    let variantName = null;
    let image = product.images[0]?.url || '';
    let variantImage = null;

    if (variantId && product.variants?.length) {
      const selectedVariant = product.variants.find(v => v._id.toString() === variantId);
      if (!selectedVariant) {
        console.error('Variant not found:', variantId);
        return res.status(400).json({ message: 'Variant not found' });
      }

      finalPrice = selectedVariant.salePrice || selectedVariant.price || finalPrice;
      variantName = selectedVariant.name;

      if (selectedVariant.image?.url) {
        image = selectedVariant.image.url;
        variantImage = selectedVariant.image.url;
      }
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingIndex = req.session.cart.findIndex(item =>
      item.productId === productId &&
      item.variantId === (variantId || null)
    );

    if (existingIndex !== -1) {
      req.session.cart[existingIndex].quantity += 1;
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
    }

    // Log the activity
    await logUserActivity({
      userId,
      sessionId,
      activityType: 'add_to_cart',
      pageUrl: req.originalUrl,
      referrer: req.get('Referrer') || '',
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip,
      metadata: {
        productId,
        variantId: variantId || null,
        variantName,
        name: product.name,
        price: finalPrice
      }
    });

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
router.post('/remove', async (req, res) => {
  const { productId, variantId } = req.body;

  if (!req.session.cart) {
    return res.redirect('/cart');
  }

  const normalizedVariantId = variantId ? String(variantId) : null;

  // Find the item being removed (for logging metadata)
  const removedItem = req.session.cart.find(item =>
    item.productId === productId && String(item.variantId) === String(normalizedVariantId)
  );

  // Filter it out from the cart
  req.session.cart = req.session.cart.filter(item =>
    !(item.productId === productId && String(item.variantId) === String(normalizedVariantId))
  );

  // Log the activity if item was found
  if (removedItem) {
    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userId = req.user ? req.user._id : null;

    await logUserActivity({
      userId,
      sessionId,
      activityType: 'remove_from_cart',
      pageUrl: req.originalUrl,
      referrer: req.get('Referrer') || '',
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip,
      metadata: {
        productId: removedItem.productId,
        variantId: removedItem.variantId,
        variantName: removedItem.variantName,
        name: removedItem.name,
        price: removedItem.price
      }
    });
  }

  res.redirect('/cart');
});

module.exports = router;