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

// Helper to detect Base64
function isBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    const baseUrl = process.env.FRONT_END_HOST || 'https://yourdomain.com';

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 30);
    end.setHours(23, 59, 59, 999);
    const salePriceEffectiveDate = `${start.toISOString()}/${end.toISOString()}`;

    const csvData = products.map(product => {
      const slug = slugify(product.name);
      const productUrl = `${baseUrl}/products/${product._id}-${slug}`;

      const rawDescription = (product.description && isBase64(product.description))
        ? Buffer.from(product.description, 'base64').toString('utf-8')
        : product.description || '';

      const description = rawDescription.replace(/<[^>]*>/g, '').trim();

      const variantPrices = product.variants?.length
        ? product.variants.map(v => v.price)
        : [product.price];

      const variantSalePrices = product.variants?.length
        ? product.variants.map(v => v.salePrice)
        : [product.salePrice];

      const minPrice = Math.min(...variantPrices.filter(p => p != null));
      const minSalePrice = Math.min(...variantSalePrices.filter(p => p != null));

      const saleActive = minSalePrice < minPrice;

      const entry = {
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
        item_group_id: product.category?.toString()
      };

      if (saleActive) {
        entry.sale_price = `${minSalePrice} UGX`;
        entry.sale_price_effective_date = salePriceEffectiveDate;
      }

      return entry;
    });

    // Clean undefined/null values
    const cleanedData = csvData.map(entry => {
      const cleaned = {};
      for (const key in entry) {
        if (entry[key] !== undefined && entry[key] !== null) {
          cleaned[key] = entry[key];
        }
      }
      return cleaned;
    });

    const parser = new Parser();
    const csv = parser.parse(cleanedData);

    res.header('Content-Type', 'text/csv');
    res.attachment('facebook_catalog.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error generating Facebook catalog:', err.message);
    res.status(500).send('Server error while generating catalog');
  }
});

module.exports = router;