// isUser middleware: allow only logged-in users
function isUser(req, res, next) {
  if (req.session.user && req.session.user.role === 'user') {
    return next();
  }
  return res.status(403).render('auth/login', {
    title: 'Login',
    error: '',
    message: 'Access denied: Users only' });
}

// isAdmin middleware: allow only admins
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('auth/login', {
    title: 'Login',
    error: '',
    message: 'Access denied: Admin only' });
}

// isGuest middleware: allow only non-logged-in users
function isGuest(req, res, next) {
  if (req.session.user) {
    return next();
  }
  return res.status(403).render('auth/login', {
    title: 'Login',
    error: '',
    message: 'Access denied:  Kindly Login' });
}

module.exports = {
  isUser,
  isAdmin,
  isGuest,
};