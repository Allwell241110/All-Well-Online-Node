const express = require('express');
const router = express.Router();
// Assuming Mongoose
const MetaCategory = require('../../models/MetaCategory');
const MainCategory = require('../../models/MainCategory');
const SubCategory = require('../../models/SubCategory');

router.get('/add-product', async (req, res) => {
  try {
    const metaCategories = await MetaCategory.find();
    const mainCategories = await MainCategory.find();
    const subCategories = await SubCategory.find();

    res.render('constant/addProductForm', {
      metaCategories,
      mainCategories,
      subCategories,
      title: 'Create Product'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading categories');
  }
});

module.exports = router;
