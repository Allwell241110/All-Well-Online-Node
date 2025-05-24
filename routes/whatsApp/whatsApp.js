const Product = require('../../models/Product');
const WhatsAppOrder = require('../../models/WhatsAppOrder');



const express = require('express');
const router = express.Router();

const logUserActivity = require('../../utils/logUserActivity');

router.post('/', async (req, res) => {
  const { name, phone, district, quantity, productId } = req.body;
  console.log('Received POST / with body:', req.body);

  if (!name || !phone || !district || !productId) {
    console.warn('Missing required fields:', { name, phone, district, productId });
    return res.status(400).send('Missing required fields');
  }

  const userId = req.session?.user?._id || null;
  const sessionId = req.sessionID;
  const pageUrl = req.originalUrl;
  const referrer = req.get('Referrer') || '';
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = req.ip;

  console.log('Session and request details:', {
    userId,
    sessionId,
    pageUrl,
    referrer,
    userAgent,
    ipAddress
  });

  try {
    const product = await Product.findById(productId);
    if (!product) {
      console.warn('Product not found:', productId);
      return res.status(404).send('Product not found');
    }
    console.log('Product found:', product.name);

    // Determine display price
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
    console.log('Calculated display price:', price);

    // Save the order
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
    console.log('Order saved successfully:', order._id);

    // Log user activity
    await logUserActivity({
      userId,
      sessionId,
      activityType: 'submitted_whatsApp_order',
      pageUrl,
      referrer,
      userAgent,
      ipAddress,
      metadata: {
        name,
        phone,
        district,
        quantity,
        productId,
        productName: product.name
      }
    });
    console.log('User activity logged');

    const { sendFacebookEvent } = require('../../utils/facebookCapi');

    const pixelId = process.env.FB_PIXEL_ID;
    const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;

    await sendFacebookEvent({
      eventName: 'Lead',
      phone,
      ip: ipAddress,
      userAgent,
      productId: product._id.toString(),
      productName: product.name,
      price: parseFloat(product.salePrice || product.price),
      pixelId,
      accessToken
    });
    console.log('Facebook event sent');

    const businessNumber = process.env.BUSINESS_NUMBER;
    const message = `Hello, I'd like to order:

*Product:* ${product.name}
*Price:* ${price}
*Quantity:* ${quantity}
*Name:* ${name}
*Phone:* ${phone}
*District:* ${district}`;

    const waURL = `https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`;
    console.log('Redirecting to WhatsApp with URL:', waURL);
    res.redirect(waURL);

  } catch (err) {
    console.error('Error during WhatsApp order:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;