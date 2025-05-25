const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const MongoStore = require('connect-mongo');
const compression = require('compression');
const minify = require('express-minify');

const cartMiddleware = require('./middleware/cartMiddleware');
const metaCategoryMiddleware = require('./middleware/metaCategories');
const pageViewActivityMiddleware = require('./middleware/pageViewActivity');
const seedAdmin = require('./config/admin/admin-config');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ===== MIDDLEWARE =====

// Body parser and logger
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));

// ===== Serve static files FIRST =====
app.use(express.static(path.join(__dirname, 'public')));

// Enable compression and minification (AFTER static middleware)
app.use(compression());
app.use(minify());

// Method override for forms
app.use(methodOverride('_method'));

// Express session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Set view engine and layout engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

// Share session user globally in views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  req.user = req.session.user;
  next();
});

// Share meta and request-related locals
app.use((req, res, next) => {
  res.locals.title = null;
  res.locals.metaDescription = null;
  res.locals.metaKeywords = null;
  res.locals.ogTitle = null;
  res.locals.ogDescription = null;
  res.locals.ogImage = null;
  res.locals.ogUrl = null;
  res.locals.canonicalUrl = null;
  res.locals.structuredData = null;
  res.locals.metaCategories = [];
  res.locals.originalUrl = req.originalUrl;
  res.locals.req = req;
  next();
});

// Custom middleware
app.use(metaCategoryMiddleware);
app.use(pageViewActivityMiddleware);
app.use(cartMiddleware);

// ===== ROUTES =====

// Static category views (forms etc.)
const staticCategoryRoutes = require('./routes/categories/static');
app.use('/categories/static', staticCategoryRoutes);

// Constant category views (dashboards etc.)
const constantCategoryRoutes = require('./routes/categories/constant');
app.use('/categories/constant', constantCategoryRoutes);

// Dynamic category views (CRUD)
const dynamicCategoryRoutes = require('./routes/categories/dynamic');
app.use('/categories', dynamicCategoryRoutes);

// Products
const constantProductRoutes = require('./routes/products/constant');
app.use('/products/constant', constantProductRoutes);

const dynamicProductRoutes = require('./routes/products/dynamic');
app.use('/products', dynamicProductRoutes);

const bulkUploadRoute = require('./routes/products/bulkUpload');
app.use('/upload-csv', bulkUploadRoute);

// Cart
const cartRoutes = require('./routes/cart/dynamic');
app.use('/cart', cartRoutes);

// Auth
const staticAuthRoutes = require('./routes/auth/static');
const dynamicAuthRoutes = require('./routes/auth/dynamic');
app.use('/auth', staticAuthRoutes);
app.use('/auth', dynamicAuthRoutes);

// Checkout
const checkoutRoutes = require('./routes/checkout/checkout');
app.use('/checkout', checkoutRoutes);

// Orders
const orderRoutes = require('./routes/order/order');
app.use('/orders', orderRoutes);

// WhatsApp order
const whatsAppRoutes = require('./routes/whatsApp/whatsApp');
app.use('/whatsapp-order', whatsAppRoutes);

// User Activity
const userActivityRoutes = require('./routes/userActivity/userActivity');
app.use('/user-activity', userActivityRoutes);

// Sitemap
const sitemapRoute = require('./routes/sitemap/sitemap');
app.use('/sitemap.xml', sitemapRoute);

// Home route
const homeRoute = require('./routes/home/constant');
app.use('/', homeRoute);

// About page
app.get('/about', (req, res) => {
  res.render('about');
});

// User dashboard
const userDashboardRoutes = require('./routes/userDashboard/userDashboard');
app.use('/dashboard/user', userDashboardRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found',
    message: null
  });
});

// ===== Connect to MongoDB and start server =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    seedAdmin(); // Seed initial admin
  })
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });