const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const locals = require('./devUniversalData/locals');
const cartMiddleware = require('./middleware/cartMiddleware');

// Load env variables
dotenv.config();

const app = express();

// Assign all local variables
app.locals.user = locals.user;







// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'ecommerceSecretKey',
  resave: false,
  saveUninitialized: true
}));

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


//Home Route:
const homeRoute = require('./routes/home/constant');
app.use('/', homeRoute);




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