const express = require('express');
const router = express.Router();
const Product = require('../../models/product');
const Category = require('../../models/category');

// Route to render the add product form
router.get('/add-product', async (req, res) => {
  const categories = await Category.find();
    res.render('products/createProduct', {title: 'Add Product', categories}); // adjust path if needed
});

// Route to render the edit product form
router.get('/edit-product/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  const categories = await Category.find();
  res.render('products/editProduct', {categories, product, title: 'Edit Product' });
});

module.exports = router;
