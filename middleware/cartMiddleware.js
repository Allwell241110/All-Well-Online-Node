module.exports = (req, res, next) => {
  if (!req.session) {
    req.session = {};
  }

  const cart = req.session.cart || [];

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  res.locals.cart = cart;
  res.locals.cartItemCount = totalItems;

  next();
};