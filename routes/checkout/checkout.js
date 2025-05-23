const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const User = require('../../models/User');
const DeliveryAddress = require('../../models/DeliveryAddress');
const District = require('../../models/District');
const { isUser, isAdmin, isGuest } = require('../../middleware/auth');

const logUserActivity = require('../../utils/logUserActivity');

const sendEmail = require('../../utils/send-email');

const { sendFacebookEvent } = require('../../utils/facebookCapi'); // Adjust path as needed
require('dotenv').config(); // Load pixel ID and access token from .env

router.get('/', async (req, res) => {
  try {
    console.log('--- Checkout Page Requested ---');

    const districts = await District.find().sort({ name: 1 });
    console.log('Fetched districts:', districts.length);

    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userId = req.user ? req.user._id : null;
    const userEmail = req.user ? req.user.email : null;
    const userPhone = req.user ? req.user.phone : null;
    const username = req.user ? req.user.name : null;

    console.log('Session ID:', sessionId);
    console.log('User ID:', userId);
    console.log('User Email:', userEmail);
    console.log('User Phone:', userPhone);

    const cartItemsCount = req.session.cart ? req.session.cart.length : 0;
    console.log('Cart Items Count:', cartItemsCount);

    await logUserActivity({
      userId,
      sessionId,
      activityType: 'view_checkout',
      pageUrl: req.originalUrl,
      referrer: req.get('Referrer') || '',
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip,
      metadata: {
        cartItemsCount
      }
    });
    console.log('Logged user activity.');

    const totalPrice = req.session.cart?.reduce((sum, item) => sum + item.price * item.qty, 0) || 0;
    console.log('Total checkout price:', totalPrice);

    await sendFacebookEvent({
      eventName: 'InitiateCheckout',
      firstName: username,
      email: userEmail,
      phone: userPhone,
      ip: req.ip,
      userAgent: req.get('User-Agent') || '',
      productId: 'checkout',
      productName: 'Initiate Checkout',
      price: totalPrice,
      pixelId: process.env.FB_PIXEL_ID,
      accessToken: process.env.FB_CAPI_ACCESS_TOKEN,
      externalId: userId,
      sourceUrl: req.originalUrl,
    });
    console.log('Facebook CAPI event sent.');

    res.render('checkout/shippingInformation', {
      title: 'Checkout',
      districts,
      error: ''
    });
    console.log('Checkout page rendered successfully.');
  } catch (error) {
    console.error('Failed to load checkout page:', error.message);
    console.error('Full error:', error);
    res.status(500).send('Server error');
  }
});

router.post('/', async (req, res) => {
  const { name, email, phone, deliveryAddress } = req.body;
  let userId = req.session.user ? req.session.user._id : req.body.userId;
  
  const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
  const userAgent = req.get('User-Agent') || '';

  if (!name || !phone || !deliveryAddress?.district) {
    const districts = await District.find().sort({ name: 1 });
    return res.status(400).render('checkout/shippingInformation', {
      error: 'Name, phone number and district are required',
      districts,
      title: 'Shipping Information',
    });
  }

  try {
    // ...existing user & address handling code...

    const district = deliveryAddress.district;
    const allowCOD = ['Kampala', 'Wakiso'].includes(district);

    // Log that user proceeded to payment
    await logUserActivity({
      userId,
      sessionId,
      activityType: 'proceeded_to_payment',
      pageUrl: '/checkout/payment',
      userAgent,
      ipAddress:req.ip,
      metadata: {
        district,
        allowCOD,
        cartSize: req.session.cart ? req.session.cart.length : 0
      }
    });

    // --- Facebook CAPI event for AddShippingInfo ---
    await sendFacebookEvent({
      eventName: 'AddShippingInfo',
      firstName: name,
      email,
      phone,
      ip: req.ip,
      userAgent,
      productId: 'checkout_shipping',
      productName: 'Checkout Shipping Information',
      price: req.session.cart?.reduce((sum, item) => sum + item.price * item.qty, 0) || 0,
      pixelId: process.env.FB_PIXEL_ID,
      accessToken: process.env.FB_CAPI_ACCESS_TOKEN,
      externalId: userId,
      sourceUrl: req.originalUrl,
    });

    res.render('checkout/payment', {
      title: 'Payment Information',
      allowCOD,
      district,
    });

  } catch (err) {
    console.error(err);
    const districts = await District.find().sort({ name: 1 });
    return res.status(500).render('checkout/shippingInformation', {
      error: 'Something went wrong',
      user: req.session.user || null,
      districts,
      title: 'Shipping Information',
    });
  }
});

router.post('/confirm', isGuest, async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const { deliveryFee, paymentMethod } = req.body;
    const user = req.session.user;

    if (!user || !user._id) {
      return res.status(401).send('User not logged in.');
    }

    const deliveryAddress = await DeliveryAddress.findOne({ user: user._id }).lean();

    if (!deliveryAddress) {
      return res.status(404).send('Delivery address not found.');
    }

    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip;
    const referrer = req.get('Referrer') || '';

    await logUserActivity({
      userId: user._id,
      sessionId,
      activityType: 'reached_order_confirmation',
      pageUrl: req.originalUrl,
      userAgent,
      ipAddress,
      referrer,
      metadata: {
        deliveryFee: Number(deliveryFee),
        paymentMethod,
        cartSize: cart.length,
        district: deliveryAddress.district
      }
    });

    // --- Facebook CAPI: Track order confirmation step ---
    await sendFacebookEvent({
  eventName: 'InitiateCheckout',
  email: user.email,
  phone: user.phoneNumber,
  ip: ipAddress,
  userAgent,
  cart,
  productName: 'Cart Checkout',
  price: cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + Number(deliveryFee),
  pixelId: process.env.FB_PIXEL_ID,
  accessToken: process.env.FB_CAPI_ACCESS_TOKEN,
  sourceUrl: req.originalUrl,
  referrer: req.get('Referrer') || '', // optional: where the user came from
  sessionId: req.sessionID || req.cookies['sessionId'] || 'unknown_session',
  userId: user._id || 'guest_user',
  firstName: user.name,
});

    res.render('checkout/confirm', {
      title: 'Confirm Your Order',
      cart,
      deliveryFee: Number(deliveryFee),
      paymentMethod,
      deliveryAddress
    });

  } catch (error) {
    console.error('Error fetching delivery address:', error);
    res.status(500).send('Server error while confirming order.');
  }
});

const Order = require('../../models/Order');
const uuid = require('uuid');
const { getMomoToken } = require('../../utils/momoTokenManager');

const { v4: uuidv4 } = require('uuid');


router.post('/process', isGuest, async (req, res) => {
  const { paymentMethod, momoNumber, totalAmount, deliveryAddress } = req.body;
  const cart = req.session.cart || [];
  const user = req.session.user;

  if (!user || !user._id) {
    return res.status(401).send('Unauthorized. Please log in first.');
  }

  if (paymentMethod === 'prepaid') {
    const validPrefixes = ['077', '078', '076'];
    const isValid = /^\d{10}$/.test(momoNumber) && validPrefixes.includes(momoNumber.slice(0, 3));
    if (!isValid) {
      return res.status(400).send('Invalid MTN number format.');
    }
  }

  try {
    // Use provided delivery address or fallback to saved one
    let address = deliveryAddress;
    if (!address || !address.district) {
      const savedAddress = await DeliveryAddress.findOne({ user: user._id }).lean();
      if (!savedAddress) {
        return res.status(400).send('Delivery address is required.');
      }
      address = savedAddress;
    }

    const order = new Order({
      userId: user._id,
      items: cart,
      total: Number(totalAmount),
      paymentMethod,
      momoNumber: paymentMethod === 'prepaid' ? momoNumber : undefined,
      paymentStatus: paymentMethod === 'prepaid' ? 'Pending' : 'Unpaid',
      deliveryAddress: {
        district: address.district,
        village: address.village,
        street: address.street
      },
      createdAt: new Date(),
      transactions: []
    });

    if (paymentMethod === 'prepaid') {
      const referenceId = uuidv4();
      order.transactions.push({
        externalId: referenceId,
        status: 'Pending',
        createdAt: new Date()
      });
    }

    await order.save();

    // Send confirmation email
    const itemsList = cart.map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">UGX ${item.price.toLocaleString()}</td>
      </tr>
    `).join('');

    const emailHTML = `
      <h3>Order Confirmation</h3>
      <p>Thank you for your order! Here are the details:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd;">Item</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsList}</tbody>
      </table>
      <p><strong>Total: UGX ${Number(totalAmount).toLocaleString()}</strong></p>
      <p>Delivery Address: ${address.street}, ${address.village}, ${address.district}</p>
      <p>We will contact you shortly to confirm delivery.</p>
      <p><em>All Well Enterprises</em></p>
    `;

    await sendEmail({
      to: [process.env.EMAIL_USER, user.email],
      subject: 'Order Confirmation - All Well Enterprises',
      html: emailHTML
    });

    // Log user activity
    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip;
    const referrer = req.get('Referrer') || '';

    await logUserActivity({
      userId: user._id,
      sessionId,
      activityType: 'order_placed',
      pageUrl: req.originalUrl,
      userAgent,
      ipAddress,
      referrer,
      metadata: {
        orderId: order._id,
        total: order.total,
        itemsCount: cart.length,
        paymentMethod,
        paymentStatus: order.paymentStatus,
        momoNumber: paymentMethod === 'prepaid' ? momoNumber : undefined,
        district: address.district
      }
    });

    // Clear cart
    req.session.cart = [];

    // Initiate mobile money payment
    if (paymentMethod === 'prepaid') {
      const externalId = order.transactions[order.transactions.length - 1].externalId;
      const accessToken = await getMomoToken();

      await axios.post(
        `${process.env.MOMO_BASE_URL}/collection/v1_0/requesttopay`,
        {
          amount: totalAmount,
          currency: process.env.CURRENCY,
          externalId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: momoNumber,
          },
          payerMessage: 'Payment for your order',
          payeeNote: 'Thank you for your purchase',
        },
        {
          headers: {
            'X-Reference-Id': externalId,
            'X-Target-Environment': process.env.TARGET_ENVIRONMENT,
            'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Payment request sent with ref:', externalId);
      return res.render('checkout/paymentPending', {
        title: 'Processing Payment',
        orderId: order._id 
      });
    }
// Track purchase or payment intent with Facebook CAPI
await sendFacebookEvent({
  eventName: paymentMethod === 'prepaid' ? 'InitiateCheckout' : 'Purchase',
  email: user.email,
  phone: user.phoneNumber,
  firstName: user.name,
  externalId: user._id.toString(),
  ip: ipAddress,
  userAgent,
  productId: cart.map(item => item._id).join(','),
  productName: 'Cart Checkout',
  price: Number(totalAmount),
  pixelId: process.env.FB_PIXEL_ID,
  accessToken: process.env.FB_CAPI_ACCESS_TOKEN,
  sourceUrl: req.protocol + '://' + req.get('host') + req.originalUrl
});
    res.render('checkout/success', {
      title: 'Order Placed Successfully!'
    });
  } catch (err) {
    console.error('Order processing error:', err?.response?.data || err.message);
    res.status(500).send('Something went wrong. Please try again.');
  }
});


router.post('/retry-payment', isGuest, async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order || order.paymentMethod !== 'prepaid') {
      return res.status(404).send('Invalid or non-prepaid order.');
    }

    if (order.paymentStatus === 'Paid') {
      return res.redirect('/checkout/success');
    }

    const referenceId = uuidv4();
    const accessToken = await getMomoToken();

    await axios.post(
      `${process.env.MOMO_BASE_URL}/collection/v1_0/requesttopay`,
      {
        amount: order.total,
        currency: process.env.CURRENCY,
        externalId: referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: order.momoNumber,
        },
        payerMessage: 'Payment for your order',
        payeeNote: 'Thank you for your purchase'      },
      {
        headers: {
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.TARGET_ENVIRONMENT,
          'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Retry payment request sent for order:', orderId);
    
    const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip;
    const referrer = req.get('Referrer') || '';
    const userId = req.session.user?._id || order.userId;

    await logUserActivity({
      userId,
      sessionId,
      activityType: 'retry_payment',
      pageUrl: req.originalUrl,
      userAgent,
      ipAddress,
      referrer,
      metadata: {
        orderId: order._id,
        total: order.total,
        momoNumber: order.momoNumber,
        previousStatus: order.paymentStatus
      }
    });
    
    res.render('checkout/paymentPending', {
      title: 'Processing Payment',
      orderId });

  } catch (err) {
    console.error('Retry payment error:', err?.response?.data || err.message);
    res.status(500).send('Failed to retry payment. Try again later.');
  }
});


module.exports = router;