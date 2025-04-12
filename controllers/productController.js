const Product = require('../models/product');
const axios = require('axios');

// GET all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.render('products/listProducts', { products }); // Or return JSON for API use
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// GET product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found');
    res.render('products/show', { product });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// POST create product (admin only)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, salePrice, brand, category, stock } = req.body;

    const uploadedImageLinks = [];

    const files = req.files;

    for (const file of files) {
      const imgurResponse = await axios.post(
        'https://api.imgur.com/3/image',
        {
          image: file.buffer.toString('base64'),
          type: 'base64'
        },
        {
          headers: {
            Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`
          }
        }
      );

      uploadedImageLinks.push({
        url: imgurResponse.data.data.link,
        deleteHash: imgurResponse.data.data.deletehash
      });
    }

    const newProduct = await Product.create({
      name,
      description,
      price,
      salePrice,
      brand,
      images: uploadedImageLinks,
      category,
      stock
    });

    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating product');
  }
};



// PUT update product (admin only)
exports.updateProduct = async (req, res) => {
  try {
    const files = req.files;
    let imageLinks = [];

    // If new images are provided, upload them to Imgur
    if (files && files.length > 0) {
      // Find product
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).send('Product not found');

      // Delete old images from Imgur
      for (const img of product.images) {
        if (img.deleteHash) {
          await axios.delete(`https://api.imgur.com/3/image/${img.deleteHash}`, {
            headers: {
              Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`
            }
          });
        }
      }

      // Upload new images to Imgur
      for (const file of files) {
        const imgurResponse = await axios.post(
          'https://api.imgur.com/3/image',
          {
            image: file.buffer.toString('base64'),
            type: 'base64'
          },
          {
            headers: {
              Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`
            }
          }
        );

        // Push both URL and deleteHash for future deletion
        imageLinks.push({
          url: imgurResponse.data.data.link,
          deleteHash: imgurResponse.data.data.deletehash
        });
      }

      // Add new image links and deleteHashes to the update payload
      req.body.images = imageLinks;
    }

    // Update the product with new details
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updated) return res.status(404).send('Product not found');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating product');
  }
};



// DELETE product (admin only)
exports.deleteProduct = async (req, res) => {
  try {
    // Find the product to get image details
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found');

    // Delete images from Imgur
    for (const img of product.images) {
      if (img.deleteHash) {
        await axios.delete(`https://api.imgur.com/3/image/${img.deleteHash}`, {
          headers: {
            Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`
          }
        });
      }
    }

    // Delete the product from the database
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send('Product not found');
    
    res.json({ message: 'Product and its images deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting product');
  }
};

