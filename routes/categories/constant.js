const express = require('express');
const router = express.Router();
const MetaCategory = require('../../models/MetaCategory');

// GET all meta categories
router.get('/all-categories', async (req, res) => {
  const metaCategories = await MetaCategory.find();
  res.render('constant/categoryList', { metaCategories, title: 'Meta Category List' });
});

module.exports = router;

