const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const MainCategory = require('../../models/MainCategory');
const SubCategory = require('../../models/SubCategory');
const MetaCategory = require('../../models/MetaCategory');

router.get('/', async (req, res) => {
  try {
    const baseUrl = process.env.FRONT_END_HOST;

    // Fetch products and categories from DB
    const [products, mainCategories, subCategories, metaCategories] = await Promise.all([
      Product.find({}, '_id updatedAt name').lean(),
      MainCategory.find({}, '_id name').lean(),
      SubCategory.find({}, '_id name').lean(),
      MetaCategory.find({}, '_id name').lean()
    ]);

    // Helper function to format date for sitemap
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Helper function to slugify product names
    const slugify = (name) =>
      name.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    // Start building XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add homepage
    xml += `
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;

    // Add meta category URLs
    for (const metaCat of metaCategories) {
      xml += `
  <url>
    <loc>${baseUrl}/categories/main-categories/${metaCat._id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }

    // Add main category URLs
    for (const mainCat of mainCategories) {
      xml += `
  <url>
    <loc>${baseUrl}/categories/sub-categories/${mainCat._id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }

    // Add subcategory URLs
    for (const subCat of subCategories) {
      const encodedName = encodeURIComponent(subCat.name);
      xml += `
  <url>
    <loc>${baseUrl}/categories/products/${encodedName}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }

    // Add product URLs
    for (const product of products) {
      const lastMod = product.updatedAt ? formatDate(product.updatedAt) : null;
      const slug = slugify(product.name);
      const productUrl = `${baseUrl}/products/${product._id}-${slug}`;

      xml += `
  <url>
    <loc>${productUrl}</loc>`;
      if (lastMod) {
        xml += `
    <lastmod>${lastMod}</lastmod>`;
      }
      xml += `
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
    }

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;