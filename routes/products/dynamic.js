const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const Product = require('../../models/Product');
const MetaCategory = require('../../models/MetaCategory');
const MainCategory = require('../../models/MainCategory');
const SubCategory = require('../../models/SubCategory');
require('dotenv').config();
const { isUser, isAdmin, isGuest } = require('../../middleware/auth');

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

function isBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (err) {
    return false;
  }
}
const Order = require('../../models/Order'); // adjust path as needed
const UserActivity = require('../../models/UserActivity');

router.post('/', isAdmin, upload.any(), async (req, res) => {
  try {
    console.log('--- Incoming Request ---');
    console.log('Fields:', req.body);
    console.log('Files:', req.files?.map(f => f.fieldname));

    const {
      name,
      description,
      price,
      salePrice,
      brand,
      stock,
      metaCategoryId,
      mainCategoryId,
      subCategoryId,
    } = req.body;

    let variants = Object.values(req.body.variants || {}).filter(variant => variant.name);

    // Fix malformed variant fields if submitted as nested arrays
    if (
      variants.length &&
      (
        Array.isArray(variants[0]?.name) ||
        Array.isArray(variants[0]?.price) ||
        Array.isArray(variants[0]?.salePrice) ||
        Array.isArray(variants[0]?.stock)
      )
    ) {
      const names = variants[0].name || [];
      const prices = variants[0].price || [];
      const salePrices = variants[0].salePrice || [];
      const stocks = variants[0].stock || [];

      variants = names.map((name, i) => ({
        name,
        price: isNaN(parseFloat(prices[i])) ? 0 : parseFloat(prices[i]),
        salePrice: salePrices[i] ? parseFloat(salePrices[i]) : null,
        stock: isNaN(parseInt(stocks[i])) ? 0 : parseInt(stocks[i]),
      }));
    } else {
      variants = variants.map(v => {
        const name = Array.isArray(v.name) ? v.name[0] : v.name;
        const rawPrice = Array.isArray(v.price) ? v.price[0] : v.price;
        const rawSalePrice = Array.isArray(v.salePrice) ? v.salePrice[0] : v.salePrice;
        const rawStock = Array.isArray(v.stock) ? v.stock[0] : v.stock;

        return {
          name,
          price: isNaN(parseFloat(rawPrice)) ? 0 : parseFloat(rawPrice),
          salePrice: rawSalePrice ? parseFloat(rawSalePrice) : null,
          stock: isNaN(parseInt(rawStock)) ? 0 : parseInt(rawStock),
          removedImage: v.removedImage || '',
        };
      });
    }

    // Map uploaded files
    const fileMap = {};
    req.files?.forEach(file => {
      fileMap[file.fieldname] = file;
    });

    // Handle product images
    let uploadedProductImages = [];
    const productImages = req.files?.filter(file => file.fieldname === 'newImages') || [];
    try {
      uploadedProductImages = await Promise.all(
        productImages.map(file => uploadToImgur(file.buffer))
      );
    } catch (imgErr) {
      console.error('Failed to upload product images:', imgErr.message);
      return res.status(500).json({ error: 'Failed to upload product images' });
    }

    // Handle variant images
    for (let i = 0; i < variants.length; i++) {
      const fieldKey = `variantImage_${i}`;
      const file = fileMap[fieldKey];

      if (file) {
        try {
          const uploaded = await uploadToImgur(file.buffer);
          variants[i].image = {
            url: uploaded.url,
            deleteHash: uploaded.deleteHash,
          };
          console.log(`Uploaded image for variant ${i}:`, uploaded.url);
        } catch (imgErr) {
          console.error(`Failed to upload variant image for ${fieldKey}:`, imgErr.message);
        }
      }
    }

    // Format final variant structure
    const finalVariants = variants.map(v => ({
      name: v.name,
      price: isNaN(Number(v.price)) ? 0 : Number(v.price),
      salePrice: v.salePrice ? Number(v.salePrice) : null,
      stock: isNaN(Number(v.stock)) ? 0 : Number(v.stock),
      image: v.image || undefined,
    }));

    // Create and save the product
    const newProduct = new Product({
      name: name?.trim(),
      description: description?.trim(),
      price: isNaN(Number(price)) ? 0 : Number(price),
      salePrice: salePrice ? Number(salePrice) : null,
      brand: brand?.trim(),
      stock: isNaN(Number(stock)) ? 0 : Number(stock),
      metaCategory: metaCategoryId,
      mainCategory: mainCategoryId,
      category: subCategoryId,
      images: uploadedProductImages,
      variants: finalVariants,
    });

    const savedProduct = await newProduct.save();
    console.log('Product created:', savedProduct);
    res.status(201).json(savedProduct);
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
   const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "All Products - All Well Online",
    "itemListOrder": "https://schema.org/ItemListOrderDescending",
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "Product",
      "position": index + 1,
      "name": product.name,
      "image": product.images[0].url || `${process.env.FRONT_END_HOST}/images/all_well_online.png`,
      "description": product.description || '',
      "sku": product._id,
      "offers": {
        "@type": "Offer",
        "url": `${process.env.FRONT_END_HOST}/products/${product.name}`,
        "priceCurrency": "UGX",
        "price": product.salePrice || product.price,
        "availability": "https://schema.org/InStock"
    }
  }))
};
    res.render('products/products', {
    title: 'All Products - All Well Online',
    metaDescription: 'Browse all products available at All Well Online. Find deals, sort by price, and explore our wide range of items.',
    metaKeywords: 'all products, online shopping, All Well, deals, price, shop now',
    ogTitle: 'All Products - All Well Online',
    ogDescription: 'Explore a wide range of quality products at All Well Online. Shop now and enjoy great deals!',
    ogImage: `${process.env.FRONT_END_HOST}/images/all_well_online.png`,
    ogUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
    canonicalUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
    ogType: 'website',
    structuredData,
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

const logUserActivity = require('../../utils/logUserActivity');

router.get('/:idSlug', async (req, res) => {
  try {
    const idSlug = req.params.idSlug;
    const [productId] = idSlug.split('-');

    const userId = req.session?.user?._id;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).render('404', { message: 'Product not found' });

    // Validate slug (optional redirect for canonical URL)
    const expectedSlug = product.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    if (idSlug !== `${productId}-${expectedSlug}`) {
      return res.redirect(301, `/products/${productId}-${expectedSlug}`);
    }

    // Decode base64 description if needed
    const isBase64 = (str) => {
      try {
        return Buffer.from(str, 'base64').toString('base64') === str;
      } catch {
        return false;
      }
    };

    if (isBase64(product.description)) {
      product.description = Buffer.from(product.description, 'base64').toString('utf-8');
    }

    // Log user activity
    await logUserActivity({
      userId,
      sessionId: req.sessionID,
      activityType: 'viewed_product',
      pageUrl: req.originalUrl,
      referrer: req.get('Referrer') || '',
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip,
      metadata: {
        productId: product._id,
        productName: product.name,
        price: product.salePrice || product.price,
      }
    });

    // Check if user has purchased
    let hasPurchased = false;
    if (userId) {
      const orders = await Order.find({ userId });
      hasPurchased = orders.some(order =>
        order.items.some(item =>
          item.productId.toString() === product._id.toString()
        )
      );
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "image": Array.isArray(product.images) ? product.images.map(img => img.url) : [],
      "description": product.description,
      "sku": product._id.toString(),
      "brand": { "@type": "Brand", "name": product.brand },
      "offers": {
        "@type": "Offer",
        "url": `${process.env.FRONT_END_HOST}${req.originalUrl}`,
        "priceCurrency": "UGX",
        "price": product.salePrice || product.price,
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    };

    res.render('products/product', {
      title: `${product.name} - All Well Online`,
      metaDescription: product.description?.slice(0, 160) || `Buy ${product.name} online at All Well.`,
      metaKeywords: `${product.name}, online shopping, All Well`,
      ogTitle: `${product.name} - All Well Online`,
      ogDescription: product.description?.slice(0, 160) || `Buy ${product.name} online at All Well.`,
      ogImage: product.images?.[0]?.url || `${process.env.FRONT_END_HOST}/images/all_well_online.png`,
      ogUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
      canonicalUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
      ogType: 'product',
      product,
      canReview: hasPurchased,
      structuredData
    });

  } catch (err) {
    console.error('Error fetching product by ID and slug:', err.message);
    res.status(500).send('Server error while fetching product details');
  }
});

router.get('/edit/:productId', isAdmin, async (req, res) => {
  const variants = req.query.variants === 'true';
  try {
    const { productId } = req.params;
    
    const [metaCategories, mainCategories, subCategories, product] = await Promise.all([
      MetaCategory.find(),
      MainCategory.find(),
      SubCategory.find(),
      Product.findById(productId)
    ]);

    if (!product) {
      return res.status(404).send('Product not found');
    }
    
    if (isBase64(product.description)) {
  product.description = Buffer.from(product.description, 'base64').toString('utf-8');
}

    res.render('products/addProductForm', {
      title: 'Edit Product',
      product,
      editing: true,
      metaCategories,
      mainCategories,
      subCategories,
      variants
    });
  } catch (err) {
    console.error('Error fetching product for editing:', err.message);
    res.status(500).send('Server error while fetching product');
  }
});

router.put('/:productId', isAdmin, upload.any(), async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      name,
      description,
      price,
      salePrice,
      brand,
      stock,
      metaCategoryId,
      mainCategoryId,
      subCategoryId,
      removedImages,
    } = req.body;

    let variants = Object.values(req.body.variants || {}).filter(variant => variant.name);

    // Fix malformed variant fields if submitted as nested arrays
    if (
  Array.isArray(variants[0]?.name) ||
  Array.isArray(variants[0]?.price) ||
  Array.isArray(variants[0]?.salePrice) ||
  Array.isArray(variants[0]?.stock)
) {
  const names = variants[0].name || [];
  const prices = variants[0].price || [];
  const salePrices = variants[0].salePrice || [];
  const stocks = variants[0].stock || [];

  variants = names.map((name, i) => ({
    name,
    price: isNaN(parseFloat(prices[i])) ? 0 : parseFloat(prices[i]),
    salePrice: salePrices[i] ? parseFloat(salePrices[i]) : null,
    stock: isNaN(parseInt(stocks[i])) ? 0 : parseInt(stocks[i]),
  }));
} else {
  variants = variants.map(v => {
    const name = Array.isArray(v.name) ? v.name[0] : v.name;
    const rawPrice = Array.isArray(v.price) ? v.price[0] : v.price;
    const rawSalePrice = Array.isArray(v.salePrice) ? v.salePrice[0] : v.salePrice;
    const rawStock = Array.isArray(v.stock) ? v.stock[0] : v.stock;

    return {
      name,
      price: isNaN(parseFloat(rawPrice)) ? 0 : parseFloat(rawPrice),
      salePrice: rawSalePrice ? parseFloat(rawSalePrice) : null,
      stock: isNaN(parseInt(rawStock)) ? 0 : parseInt(rawStock),
      removedImage: v.removedImage || '',
    };
  });
}

    console.log('--- Incoming Update Request ---');
    console.log('Product ID:', productId);
    console.log('Body Fields:', req.body);
    console.log('Files:', req.files?.map(f => f.fieldname) || []);

    const product = await Product.findById(productId);
    if (!product) {
      console.error('Product not found for ID:', productId);
      return res.status(404).json({ error: 'Product not found' });
    }

    const newImages = req.files?.filter(f => f.fieldname === 'newImages') || [];
    const variantImages = {};
    req.files?.forEach(file => {
      const match = file.fieldname.match(/^variantImage_(\d+)$/);
      if (match) {
        const index = match[1];
        variantImages[index] = file;
      }
    });

    console.log('New Product Images:', newImages.length);
    console.log('Variant Images:', Object.keys(variantImages));

    const removed = Array.isArray(removedImages)
      ? removedImages
      : removedImages ? [removedImages] : [];

    if (removed.length > 0) {
      console.log(`Attempting to remove ${removed.length} old image(s)...`);
      const remainingImages = [];
      for (const img of product.images) {
        if (removed.includes(img.url)) {
          console.log(`--> Marked for deletion: ${img.url}`);
          if (img.deleteHash) {
            try {
              await deleteFromImgur(img.deleteHash);
              console.log(`✓ Deleted from Imgur: ${img.url}`);
            } catch (err) {
              console.error(`✗ Failed to delete ${img.url} from Imgur:`, err.message);
            }
          } else {
            console.warn(`! No deleteHash for image: ${img.url}, skipping Imgur deletion.`);
          }
        } else {
          remainingImages.push(img);
        }
      }
      product.images = remainingImages;
    } else {
      console.log('No old images marked for removal.');
    }

    if (newImages.length > 0) {
      console.log('Uploading new product images...');
      const newlyUploaded = await Promise.all(
        newImages.map(file => uploadToImgur(file.buffer))
      );
      console.log('Uploaded new images:', newlyUploaded.map(img => img.url));
      product.images.push(...newlyUploaded);
    }

    console.log('Processing variant images...');
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const file = variantImages[i.toString()];

      if (file) {
        console.log(`Uploading new image for variant ${i}...`);
        if (variant.image?.deleteHash) {
          console.log(`Deleting old variant image for variant ${i}...`);
          await deleteFromImgur(variant.image.deleteHash);
        }
        const uploaded = await uploadToImgur(file.buffer);
        console.log(`✓ Uploaded new variant image ${i}:`, uploaded.url);
        variant.image = { url: uploaded.url, deleteHash: uploaded.deleteHash };
      } else {
        const removed = variant.removedImage;

        if (removed) {
          console.log(`Variant ${i} image marked for removal.`);
          variant.image = undefined;
        } else {
          console.log(`No new image for variant ${i}, keeping existing.`);
          const existing = product.variants[i]?.image;
          if (existing && existing.url) {
            variant.image = existing;
          } else {
            delete variant.image;
          }
        }
      }
    }

    product.name = name;
    product.description = description;
    product.price = price;
    product.salePrice = salePrice || null;
    product.brand = brand || '';
    product.stock = stock;
    product.metaCategory = metaCategoryId;
    product.mainCategory = mainCategoryId;
    product.category = subCategoryId;
    product.variants = variants;

    const updated = await product.save();
    console.log('✓ Product updated successfully:', updated._id);
    res.status(200).json(updated);

  } catch (err) {
    console.error('✗ Error updating product:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:productId', isAdmin, async (req, res) => {
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

router.get('/product/view-image', (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('No image URL provided');

  res.render('products/view-image', {
  layout: false,
  title: 'Full Image',
  imageUrl: decodeURIComponent(req.query.url)
});
});

router.post('/reviews/:productId', isGuest, async (req, res) => {
  const userId = req.session?.user?._id;
  const { rating, comment } = req.body;
  const productId = req.params.productId;

  console.log(`Received review submission for product: ${productId}`);
  console.log(`User ID: ${userId}, Rating: ${rating}, Comment: ${comment}`);

  if (!userId) {
    console.warn('User not logged in. Redirecting to login.');
    return res.redirect('/auth/login');
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      console.warn(`Product not found: ${productId}`);
      return res.status(404).send('Product not found');
    }

    product.reviews = product.reviews || [];

    const newReview = {
      userId,
      userName: req.session.user.name || 'Anonymous',
      rating: Number(rating),
      comment,
    };

    console.log('Appending new review:', newReview);
    product.reviews.push(newReview);

    const ratings = product.reviews.map(r => Number(r.rating));
    const totalRating = ratings.reduce((a, b) => a + b, 0);
    product.averageRating = totalRating / ratings.length;
    product.numReviews = ratings.length;

    console.log(`Updated average rating: ${product.averageRating}`);
    console.log(`Total reviews: ${product.numReviews}`);

    await product.save();
    console.log(`Review saved successfully for product: ${product.name}`);

    res.redirect(`/products/${product.name}`);
  } catch (error) {
    console.error('Error while submitting review:', error.message);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;