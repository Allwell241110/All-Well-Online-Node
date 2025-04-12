const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// GET all categories
router.get('/', categoryController.getCategories);

// GET a single category by ID
router.get('/:id', categoryController.getCategoryById);

// POST add a category
router.post('/', categoryController.addCategory);

// PUT update a category
router.put('/:id', categoryController.updateCategory);

// DELETE remove a category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;