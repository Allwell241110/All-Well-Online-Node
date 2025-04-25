module.exports = (req, res, next) => {
  if (!req.session) {
    req.session = {};
  }

  const cart = req.session.cart || [];

  // Count distinct items, regardless of quantity
  const totalItems = cart.length;

  res.locals.cart = cart;
  res.locals.cartItemCount = totalItems;

  next();
};