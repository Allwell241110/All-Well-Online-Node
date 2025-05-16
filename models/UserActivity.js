const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },  // optional for guests
  sessionId: { type: String, required: true },
  activityType: { type: String, required: true },  // e.g., 'page_view', 'add_to_cart', 'purchase'
  pageUrl: { type: String, required: true },      // current URL where action happened
  referrer: { type: String },                      // where user came from (document.referrer)
  userAgent: { type: String },                     // browser user agent string
  ipAddress: { type: String },                     // IP address (optional, for geo)
  metadata: { type: mongoose.Schema.Types.Mixed },// any extra data (e.g. productId, categoryId)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserActivity', userActivitySchema);