const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const { Parser } = require('json2csv');

// Slugify helper
const slugify = (name) =>
  name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// Base64 detection helper
function isBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).populate('category').lean();
    const baseUrl = process.env.FRONT_END_HOST || 'https://allwellonline.shop';

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

      // Handle Base64 + HTML stripping
      let rawDescription = product.description || '';
      if (isBase64(rawDescription)) {
        rawDescription = Buffer.from(rawDescription, 'base64').toString('utf-8');
      }
      const description = rawDescription.replace(/<[^>]*>/g, '').trim();

      // Get prices from variants if available
      const variantPrices = product.variants?.length
        ? product.variants.map(v => v.price)
        : [product.price];

      const variantSalePrices = product.variants?.length
        ? product.variants.map(v => v.salePrice)
        : [product.salePrice];

      const minPrice = Math.min(...variantPrices.filter(p => p != null));
      const minSalePrice = Math.min(...variantSalePrices.filter(p => p != null));
      const saleActive = minSalePrice < minPrice;

      const stock = product.variants?.length
        ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : product.stock;

      const entry = {
        id: product._id.toString(),
        title: product.name,
        description,
        availability: stock > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        price: `${minPrice} UGX`,
        link: productUrl,
        image_link: product.images?.[0]?.url || `${baseUrl}/images/default_image.png`,
        brand: product.brand || 'All Well',
        inventory: stock,
        item_group_id: product.category?._id?.toString() || 'general'
      };

      if (saleActive) {
        entry.sale_price = `${minSalePrice} UGX`;
        entry.sale_price_effective_date = salePriceEffectiveDate;
      }

      return entry;
    });

    // Clean null/undefined fields
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
    res.attachment('google_merchant_feed.csv');
    res.send(csv);
  } catch (err) {
    console.error('Feed generation error:', err.message);
    res.status(500).send('Error generating feed');
  }
});

module.exports = router;