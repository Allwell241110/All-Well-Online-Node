const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../../models/Product');
const UserActivity = require('../../models/UserActivity');
const SubCategory = require('../../models/SubCategory');

function calculateDiscount(product) {
  if (product.variants?.length > 0) {
    const discounts = product.variants.map(v => {
      return v.price > 0 ? ((v.price - v.salePrice) / v.price) * 100 : 0;
    });
    return Math.max(...discounts);
  } else if (product.price && product.salePrice) {
    return ((product.price - product.salePrice) / product.price) * 100;
  }
  return 0;
}

router.get('/', async (req, res) => {
  try {
    const userId = req.session?.user?._id;
    const sessionId = req.sessionID;

    const matchUser = userId
      ? { userId: new mongoose.Types.ObjectId(userId), activityType: 'viewed_product' }
      : { sessionId, activityType: 'viewed_product' };

    const userViewed = await UserActivity.aggregate([
      { $match: matchUser },
      { $group: { _id: '$metadata.productId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 }
    ]);

    let viewedProductIds = userViewed.map(a => a._id).filter(Boolean);
    let viewedProducts = await Product.find({ _id: { $in: viewedProductIds } });

    if (viewedProducts.length < 4) {
      const fallback = await UserActivity.aggregate([
        { $match: { activityType: 'viewed_product', 'metadata.productId': { $ne: null } } },
        { $group: { _id: '$metadata.productId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 4 }
      ]);
      viewedProductIds = fallback.map(a => a._id);
      viewedProducts = await Product.find({ _id: { $in: viewedProductIds } });
    }

    let featuredCategoryIds = [...new Set(viewedProducts.map(p => String(p.category)))];

    if (featuredCategoryIds.length < 4) {
      const topViewedFallback = await Product.find({})
        .sort({ numReviews: -1 })
        .limit(10);
      for (let product of topViewedFallback) {
        const catId = String(product.category);
        if (!featuredCategoryIds.includes(catId)) {
          featuredCategoryIds.push(catId);
          if (featuredCategoryIds.length === 4) break;
        }
      }
    }

    const featuredCategories = await SubCategory.find({
      _id: { $in: featuredCategoryIds }
    });

    const allProducts = await Product.find({});
    const productsWithDiscount = allProducts
      .map(p => ({ ...p.toObject(), discount: calculateDiscount(p) }))
      .filter(p => p.discount > 0)
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 6);
    const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "All Well Online Store",
  "url": "https://www.allwellonline.shop",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.allwellonline.shop/products/?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

    res.render('home', {
  title: 'Home - All Well Online Store',
  metaDescription: 'Shop online in Uganda with All Well Store. From electronics to Home and Office products, explore quality products at the best prices.',
  metaKeywords: 'Uganda online store, electronics, home and office products, shop online Uganda, Uganda online Shopping',
  ogTitle: 'All Well Online Shopping – Quality Delivered',
  ogDescription: 'Shop now at All Well Store. Fast delivery. Great deals. Best quality in Uganda.',
  ogUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
  canonicalUrl: process.env.FRONT_END_HOST,
  ogImage: '',
  viewedProducts,
  featuredCategories,
  hotDeals: productsWithDiscount,
  structuredData
});
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load homepage data' });
  }
});

module.exports = router;