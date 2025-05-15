const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const User = require('../../models/User');
const DeliveryAddress = require('../../models/DeliveryAddress');
const District = require('../../models/District');
const { isUser, isAdmin, isGuest } = require('../../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const districts = await District.find().sort({ name: 1 }); // Optional: sort alphabetically

    res.render('checkout/shippingInformation', {
      title: 'Checkout',
      districts,
      error: ''
    });
  } catch (error) {
    console.error('Failed to load districts:', error.message);
    res.status(500).send('Server error');
  }
});

router.post('/', async (req, res) => {
  const { name, email, phone, deliveryAddress } = req.body;
  let userId = req.session.user ? req.session.user._id : req.body.userId;

  if (!name || !phone || !deliveryAddress?.district) {
    const districts = await District.find().sort({ name: 1 });
    return res.status(400).render('checkout/shippingInformation', {
      error: 'Name, phone number and district are required',
      districts,
      title: 'Shipping Information',
    });
  }

  try {
    let user;

    if (!userId) {
      // Guest user: check if a guest exists using phone or email
      user = await User.findOne({ $or: [{ email }, { phoneNumber: phone }] });

      if (!user) {
        // Create a new guest user if not found
        user = new User({
          name,
          phoneNumber: phone,
          email: email || undefined,
          role: 'guest',
        });
        await user.save();
      }

      userId = user._id;

      // Store the user in session
      req.session.user = {
        _id: userId,
        name: user.name,
        email: user.email,
        role: 'guest',
      };

    } else {
      // Logged in user
      user = await User.findById(userId);

      // Update missing phone number if not already set
      if (!user.phoneNumber && phone) {
        user.phoneNumber = phone;
        await user.save();
      }
    }

    // Check if the user already has a delivery address
    let address = await DeliveryAddress.findOne({ user: userId });
    if (!address) {
      address = new DeliveryAddress({
        user: userId,
        district: deliveryAddress.district,
        village: deliveryAddress.village,
        street: deliveryAddress.street,
      });
      await address.save();
    } else {
      // Update address if needed
      address.district = deliveryAddress.district;
      address.village = deliveryAddress.village;
      address.street = deliveryAddress.street;
      await address.save();
    }

    const district = deliveryAddress.district;
    const allowCOD = ['Kampala', 'Wakiso'].includes(district);

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
    const address = {
      district: deliveryAddress?.district,
      village: deliveryAddress?.village,
      street: deliveryAddress?.street,
    };

    const order = new Order({
      userId: user._id,
      items: cart,
      total: Number(totalAmount),
      paymentMethod,
      momoNumber: paymentMethod === 'prepaid' ? momoNumber : undefined,
      paymentStatus: paymentMethod === 'prepaid' ? 'Pending' : 'Unpaid',
      deliveryAddress: address,
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
    req.session.cart = [];

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
    res.render('checkout/paymentPending', {
      title: 'Processing Payment',
      orderId });

  } catch (err) {
    console.error('Retry payment error:', err?.response?.data || err.message);
    res.status(500).send('Failed to retry payment. Try again later.');
  }
});





module.exports = router;