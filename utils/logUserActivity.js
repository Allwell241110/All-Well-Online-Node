const UserActivity = require('../models/UserActivity');

async function logUserActivity({
  userId = null,
  sessionId,
  activityType,
  pageUrl,
  referrer = '',
  userAgent = '',
  ipAddress = '',
  metadata = {}
}) {
  try {
    const activity = new UserActivity({
      userId,
      sessionId,
      activityType,
      pageUrl,
      referrer,
      userAgent,
      ipAddress,
      metadata
    });

    await activity.save();
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
}

module.exports = logUserActivity;