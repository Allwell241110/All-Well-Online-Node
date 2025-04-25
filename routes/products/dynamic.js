const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const Product = require('../../models/Product');
const SubCategory = require('../../models/SubCategory');
require('dotenv').config();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload to Imgur helper
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

// Delete from Imgur helper
const deleteFromImgur = async (deleteHash) => {
  try {
    await axios.delete(`https://api.imgur.com/3/image/${deleteHash}`, {
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
      },
    });
    console.log(`Deleted image with hash: ${deleteHash}`);
  } catch (err) {
    console.error(`Failed to delete image with hash ${deleteHash}:`, err.message);
  }
};

router.post('/', upload.any(), async (req, res) => {
  try {
    console.log('--- Incoming Request ---');
    console.log('Fields:', req.body);
    console.log('Files:', req.files?.map(f => f.fieldname));

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

    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(variants || '[]');
    } catch (err) {
      console.error('Failed to parse variants JSON:', variants);
    }

    // Separate product and variant images
    const productImages = req.files?.filter(file => file.fieldname === 'images') || [];
    const variantImages = {};
    req.files?.forEach(file => {
      if (file.fieldname.startsWith('variantImage_')) {
        variantImages[file.fieldname] = file;
      }
    });

    // Upload product images
    let uploadedImages = [];
    if (productImages.length > 0) {
      uploadedImages = await Promise.all(
        productImages.map(file => uploadToImgur(file.buffer))
      );
    }

    // Upload variant images and store the URL and delete hash for each variant
    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      const fieldKey = `variantImage_${i}`;
      const file = variantImages[fieldKey];

      if (file) {
        try {
          const uploaded = await uploadToImgur(file.buffer);
          // Store the uploaded image URL and delete hash in the respective variant object
          variant.image = { url: uploaded.url, deleteHash: uploaded.deleteHash };
          console.log(`Uploaded image for variant ${i}:`, uploaded.url);
        } catch (imgErr) {
          console.error(`Failed to upload variant image for ${fieldKey}:`, imgErr.message);
        }
      } else {
        console.log(`No image provided for variant index ${i}`);
      }
    }

    // Save the product and its variants with images
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
    console.log('Product saved:', saved);
    res.status(201).json(saved);

  } catch (err) {
    console.error('Error while creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.get('/', async (req, res) => {
  try {
    // Query parameters for filtering/pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const searchQuery = req.query.search || '';
    const sort = req.query.sort || 'newest'; // e.g., 'price-asc', 'price-desc', 'newest'

    const skip = (page - 1) * limit;
    const sortOptions = {};

    // Sorting logic
    if (sort === 'price-asc') sortOptions.price = 1;
    else if (sort === 'price-desc') sortOptions.price = -1;
    else sortOptions.createdAt = -1; // newest by default

    // Filter options
    const filter = {};
    if (searchQuery) filter.name = { $regex: searchQuery, $options: 'i' };

    
    // Fetch products with filters and pagination
    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render('products/products', {
      title: 'All Well Online',
      products,
      searchQuery,
      sort,
      currentPage: page,
      totalPages,
      limit
    });
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).send('Server error while fetching products');
  }
});

router.get('/:name', async (req, res) => {
  try {
    const productName = req.params.name;

    // Find product by name (case-insensitive)
    const product = await Product.findOne({ name: new RegExp(`^${productName}$`, 'i') });

    if (!product) {
      return res.status(404).render('404', { message: 'Product not found' });
    }

    res.render('products/product', {
      title: `${product.name} - All Well Online`,
      product,
    });

  } catch (err) {
    console.error('Error fetching product by name:', err.message);
    res.status(500).send('Server error while fetching product details');
  }
});

router.get('/edit/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    res.render('products/addProductForm', {
      title: 'Edit Product',
      product, // this will be available in your view as "product"
      editing: true // flag to indicate it's an edit operation
    });
  } catch (err) {
    console.error('Error fetching product for editing:', err.message);
    res.status(500).send('Server error while fetching product');
  }
});

router.put('/:productId', upload.any(), async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      productName,
      productDescription,
      productPrice,
      productSalePrice,
      productBrand,
      productStock,
      subCatId,
      variants,
      removeImageIndexes
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Parse incoming variant JSON and remove indexes
    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(variants || '[]');
    } catch (err) {
      console.error('Invalid variant JSON:', variants);
    }

    let removeIndexes = [];
    try {
      removeIndexes = JSON.parse(removeImageIndexes || '[]');
    } catch (err) {
      console.error('Invalid removeImageIndexes:', removeImageIndexes);
    }

    // Separate files
    const productImages = req.files?.filter(f => f.fieldname === 'images') || [];
    const variantImages = {};
    req.files?.forEach(file => {
      if (file.fieldname.startsWith('variantImage_')) {
        variantImages[file.fieldname] = file;
      }
    });

    // Remove selected old product images
    const removedImages = product.images.filter((_, i) => removeIndexes.includes(i));
    removedImages.forEach(img => {
      if (img.deleteHash) deleteFromImgur(img.deleteHash);
    });
    product.images = product.images.filter((_, i) => !removeIndexes.includes(i));

    // Upload new product images
    const newlyUploaded = await Promise.all(
      productImages.map(file => uploadToImgur(file.buffer))
    );
    product.images.push(...newlyUploaded);

    // Update variants with new images and delete replaced ones
    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      const fieldKey = `variantImage_${i}`;
      const file = variantImages[fieldKey];

      if (file) {
        if (variant.image?.deleteHash) {
          await deleteFromImgur(variant.image.deleteHash);
        }
        const uploaded = await uploadToImgur(file.buffer);
        variant.image = { url: uploaded.url, deleteHash: uploaded.deleteHash };
        console.log(`Replaced image for variant ${i}:`, uploaded.url);
      } else {
        // If no new image, retain the old image (if any)
        variant.image = product.variants[i]?.image || null;
      }
    }

    // Update main fields
    product.name = productName;
    product.description = productDescription;
    product.price = productPrice;
    product.salePrice = productSalePrice;
    product.brand = productBrand;
    product.stock = productStock;
    product.category = subCatId;
    product.variants = parsedVariants;

    const updated = await product.save();
    res.status(200).json(updated);
  } catch (err) {
    console.error('Error updating product:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});


router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Delete product images from Imgur
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.deleteHash) {
          await deleteFromImgur(img.deleteHash);
        }
      }
    }

    // Delete variant images from Imgur
    if (product.variants && Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        if (variant.image?.deleteHash) {
          await deleteFromImgur(variant.image.deleteHash);
        }
      }
    }

    await Product.findByIdAndDelete(productId);
    console.log(`Deleted product ${productId} and associated images from Imgur`);
    res.status(200).json({ message: 'Product and its images deleted successfully' });

  } catch (err) {
    console.error('Error deleting product:', err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;