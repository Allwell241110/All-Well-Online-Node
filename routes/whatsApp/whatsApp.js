const Product = require('../../models/Product');
const WhatsAppOrder = require('../../models/WhatsAppOrder');


const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { name, phone, district, quantity, productId } = req.body;

  if (!name || !phone || !district || !productId) {
    return res.status(400).send('Missing required fields');
  }

  try {
    // Fetch the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Determine price to display
    let price = product.salePrice || product.price;
    if (product.variants?.length) {
      const prices = product.variants.map(v => !isNaN(v.salePrice) ? v.salePrice : v.price);
      const validPrices = prices.filter(p => !isNaN(p));
      const min = Math.min(...validPrices);
      const max = Math.max(...validPrices);
      price = (min === max) ? `UGX ${min.toLocaleString()}` : `UGX ${min.toLocaleString()} - UGX ${max.toLocaleString()}`;
    } else {
      price = `UGX ${price.toLocaleString()}`;
    }

    // Store the order (optional)
    const order = new WhatsAppOrder({
      name,
      phone,
      district,
      quantity,
      product: {
        id: product._id,
        name: product.name,
      },
      createdAt: new Date(),
    });
    await order.save();

    // Build WhatsApp message
    const businessNumber = process.env.BUSINESS_NUMBER;
    const message = `Hello, I'd like to order:

*Product:* ${product.name}
*Price:* ${price}
*Quantity:* ${quantity}
*Name:* ${name}
*Phone:* ${phone}
*District:* ${district}`;

    const waURL = `https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`;
    res.redirect(waURL);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;