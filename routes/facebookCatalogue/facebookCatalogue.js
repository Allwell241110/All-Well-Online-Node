const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const { Parser } = require('json2csv');

// Slugify function (same as in your sitemap and detail route)
const slugify = (name) =>
  name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).lean();

    const baseUrl = process.env.FRONT_END_HOST || 'https://yourdomain.com';

    const csvData = products.map(product => {
      const slug = slugify(product.name);
      const productUrl = `${baseUrl}/products/${product._id}-${slug}`;
      const rawDescription = (product.description && isBase64(product.description))
  ? Buffer.from(product.description, 'base64').toString('utf-8')
  : product.description || '';

// Strip HTML tags for Facebook compatibility
    const description = rawDescription.replace(/<[^>]*>/g, '').trim();
    
    
    // Determine the lowest variant price or fallback to product price
    const allPrices = product.variants && product.variants.length > 0
  ? product.variants.map(v => v.salePrice || v.price)
  : [product.salePrice || product.price];

    const minPrice = Math.min(...allPrices);

      return {
        id: product._id.toString(),
        title: product.name,
        description,
        availability: (product.stock > 0 || product.variants?.some(v => v.stock > 0)) ? 'in stock' : 'out of stock',
        condition: 'new',
        price: `${minPrice} UGX`,
        link: productUrl,
        image_link: product.images?.[0]?.url || `${baseUrl}/images/all_well_online.png`,
        brand: product.brand || 'All Well',
        inventory: product.stock || product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0),
      };
    });

    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.attachment('facebook_catalog.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error generating Facebook catalog:', err.message);
    res.status(500).send('Server error while generating catalog');
  }
});

// Helper to detect Base64
function isBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

module.exports = router;