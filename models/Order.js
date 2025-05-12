const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      variantName: String,
      price: Number,
      quantity: Number
    }
  ],
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'prepaid'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Unpaid', 'Failed'],
    default: 'Unpaid'
  },
  momoNumber: {
    type: String // Only filled if paymentMethod is 'prepaid'
  },
  deliveryAddress: {
    district: String,
    village: String,
    street: String
  },
  status: {
    type: String,
    enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Processing'
  },
  transactions: [
    {
      externalId: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['Pending', 'Successful', 'Failed'],
        default: 'Pending'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  transactionId: String, // MoMo financialTransactionId (only for successful payment)
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);