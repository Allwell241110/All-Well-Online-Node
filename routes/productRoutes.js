const express = require('express');
const multer = require('multer');
const router = express.Router();
const productController = require('../controllers/productController');

// Set up multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// GET all products (for homepage, shop, etc.)
router.get('/', productController.getAllProducts);

// GET single product detail page
router.get('/:id', productController.getProductById);

// Admin routes (optional auth middleware)
// Create new product
router.post('/', upload.array('images'), productController.createProduct); // Use multer to handle file uploads

// Update product
router.put('/:id', upload.array('images'), productController.updateProduct); // Handle file uploads for updating

// Delete product
router.delete('/:id', productController.deleteProduct);

module.exports = router;
