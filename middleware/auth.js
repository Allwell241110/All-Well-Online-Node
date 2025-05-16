// isUser middleware: allow only logged-in users
function isUser(req, res, next) {
  if (req.session.user && req.session.user.role === 'user') {
    return next();
  }

  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }

  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
}

// isGuest middleware: allow only non-logged-in users
function isGuest(req, res, next) {
  if (req.session.user) {
    return next();
  }

  // Save original URL before redirecting
  req.session.returnTo = req.originalUrl;

  return res.redirect('/auth/login');
}

module.exports = {
  isUser,
  isAdmin,
  isGuest,
};