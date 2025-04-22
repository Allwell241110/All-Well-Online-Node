const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const Product = require('../models/Product');
require('dotenv').config();

// Store files in memory for Imgur upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload a single file buffer to Imgur
const uploadToImgur = async (fileBuffer) => {
  const base64Img = fileBuffer.toString('base64');

  const res = await axios.post('https://api.imgur.com/3/image', {
    image: base64Img,
    type: 'base64',
  }, {
    headers: {
      Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
    },
  });

  const { link, deletehash } = res.data.data;
  return { url: link, deleteHash: deletehash };
};

// Create a product with single or multiple images
router.post('/products', upload.array('images'), async (req, res) => {
  try {
    const {
      productName,
      productDescription,
      productPrice,
      productSalePrice,
      productBrand,
      productStock,
      subCatId,
      variants
    } = req.body;

    const parsedVariants = JSON.parse(variants || '[]');

    // Upload product images (can be one or many)
    let uploadedImages = [];

    if (req.files && req.files.length > 0) {
      uploadedImages = await Promise.all(
        req.files.map(file => uploadToImgur(file.buffer))
      );
    }

    // Upload each variant image if included
    for (let variant of parsedVariants) {
      if (variant.imageBase64) {
        const image = await uploadToImgur(
          Buffer.from(variant.imageBase64.split(',')[1], 'base64')
        );
        variant.image = image;
      }
    }

    const newProduct = new Product({
      name: productName,
      description: productDescription,
      price: productPrice,
      salePrice: productSalePrice,
      brand: productBrand,
      stock: productStock,
      images: uploadedImages,
      category: subCatId,
      variants: parsedVariants,
    });

    const saved = await newProduct.save();
    res.status(201).json(saved);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating product' });
  }
});

module.exports = router;