const express = require('express');
const router = express.Router();
// Assuming Mongoose
const MetaCategory = require('../../models/MetaCategory');
const MainCategory = require('../../models/MainCategory');
const SubCategory = require('../../models/SubCategory');
const { isUser, isAdmin, isGuest } = require('../../middleware/auth');


router.get('/product-nature', isAdmin, (req, res) => {

  res.render('products/productNature', {

    title: 'Product Nature'
  });
});

router.get('/add-product', isAdmin, async (req, res) => {
  const variants = req.query.variants === 'true';
  try {
    const metaCategories = await MetaCategory.find();
    const mainCategories = await MainCategory.find();
    const subCategories = await SubCategory.find();

    res.render('products/addProductForm', {
      metaCategories,
      mainCategories,
      subCategories,
      title: 'Create Product',
      product: null,
      editing: false,
      variants
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading categories');
  }
});





module.exports = router;
