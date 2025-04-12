// controllers/paymentController.js
const Payment = require('../models/payment');
const Order = require('../models/order');

exports.initiatePayment = async (req, res) => {
  try {
    const { orderId, method, phone } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' }); 

    const paymentData = {
      orderId,
      method,
      status: method === 'Cash on Delivery' ? 'Pending' : 'Initiated',
      amount: order.total,
      phone,
    };

    const payment = await Payment.create(paymentData);

    if (method === 'MTN Mobile Money') {
      // 🌐 Mock: Simulate MoMo API call
      // In production, you'd call MTN OpenAPI here with axios/fetch
      // For now, assume success and return fake transaction ID

      const fakeTransactionId = 'MTN' + Date.now();

      payment.status = 'Paid';
      payment.referenceId = fakeTransactionId;
      await payment.save();

      order.paymentStatus = 'Paid';
      await order.save();

      return res.json({
        message: 'MTN MoMo payment successful (mocked)',
        transactionId: fakeTransactionId,
        payment,
      });
    }

    // For Cash on Delivery
    return res.json({
      message: 'Payment set as Cash on Delivery. Please pay upon delivery.',
      payment,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// Optional: MTN Callback Handler (for real integration)
exports.handleMTNCallback = async (req, res) => {
  // Handle payment confirmation webhook from MTN here
  // You’d update payment and order status based on their response
  res.status(200).send('Callback received');
};
