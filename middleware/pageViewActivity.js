const logUserActivity = require('../utils/logUserActivity');

async function pageViewActivityMiddleware(req, res, next) {
  const sessionId = req.sessionID || req.cookies['sessionId'] || 'unknown_session';

  const userId = req.user ? req.user._id : null;

  // Log page view
  await logUserActivity({
    userId,
    sessionId,
    activityType: 'page_view',
    pageUrl: req.originalUrl,
    referrer: req.get('Referrer') || '',
    userAgent: req.get('User-Agent') || '',
    ipAddress: req.ip
  });

  next();
}

module.exports = pageViewActivityMiddleware;