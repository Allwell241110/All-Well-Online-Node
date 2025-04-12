const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const session = require('express-session');

// Load env variables
dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Session (if needed for login)
app.use(session({
  secret: 'ecommerceSecretKey',
  resave: false,
  saveUninitialized: true
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes

//MAJOR ROUTES:
//Home Route:
const homeRoute = require('./routes/homeRoute');
app.use('/', homeRoute);

//Dynamic Routes
const productRoutes = require('./routes/productRoutes');
app.use('/products', productRoutes);

const cartRoutes = require('./routes/cartRoutes');
app.use('/cart', cartRoutes);

const orderRoutes = require('./routes/orderRoutes');
app.use('/orders', orderRoutes);

const reviewRoutes = require('./routes/reviewRoutes');
app.use('/reviews', reviewRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/user', userRoutes);

const userActivityRoutes = require('./routes/userActivityRoutes');
app.use('/activities', userActivityRoutes);


const categoryRoutes = require('./routes/categoryRoutes');
app.use('/categories', categoryRoutes);




//STATIC ROUTES:

const adminForms = require('./routes/static/adminForms');
app.use('/forms/admin', adminForms);

const authForms = require('./routes/static/authForms');
app.use('/forms/auth', authForms);

const pagesRoutes = require('./routes/static/pageViews');
app.use('/pages', pagesRoutes);

const productForms = require('./routes/static/productForms');
app.use('/products', productForms);



// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Connect to MongoDB and start server only after successful connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
  console.log('✅ MongoDB connected');

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1); // Exit the app if MongoDB connection fails
});