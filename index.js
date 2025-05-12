const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const cartMiddleware = require('./middleware/cartMiddleware');
const methodOverride = require('method-override');
const MongoStore = require('connect-mongo');
const seedAdmin = require('./config/admin/admin-config');

// Load env variables
dotenv.config();

const app = express();


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.use((req, res, next) => {
  res.locals.originalUrl = req.originalUrl;
  next();
});

app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.use(expressLayouts);

//Custom Middleware
app.use(cartMiddleware);



// Set view engine


// Routes

//Category routes

// Static Views: just renders forms or non-data-dependent views
const staticCategoryRoutes = require('./routes/categories/static');
app.use('/categories/static', staticCategoryRoutes);

// Constant Views: list of categories, dashboard views etc.
const constantCategoryRoutes = require('./routes/categories/constant');
app.use('/categories/constant', constantCategoryRoutes);

// Dynamic Views + APIs: editing, submitting, deleting etc.
const dynamicCategoryRoutes = require('./routes/categories/dynamic');
app.use('/categories', dynamicCategoryRoutes); // keep this for standard REST paths

//PRODUCT ROUTES:
const constantProductRoutes = require('./routes/products/constant');
app.use('/products/constant', constantProductRoutes);

const dynamicProductRoutes = require('./routes/products/dynamic');
app.use('/products', dynamicProductRoutes);


//Cart Routes:
const cartRoutes = require('./routes/cart/dynamic');
app.use('/cart', cartRoutes);

//Auth routes:
const staticAuthRoutes = require('./routes/auth/static');
app.use('/auth', staticAuthRoutes);
const dynamicAuthRoutes = require('./routes/auth/dynamic');
app.use('/auth', dynamicAuthRoutes);

//Checkout routes:
const checkoutRoutes = require('./routes/checkout/checkout');
app.use('/checkout', checkoutRoutes);


//Home Route:
const homeRoute = require('./routes/home/constant');
app.use('/', homeRoute);




// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found',
      message: null
  });
});

// Connect to MongoDB and start server only after successful connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    seedAdmin();
  })
  .then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1); // Exit the app if MongoDB connection fails
});