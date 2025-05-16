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

    res.render('home', {
      title: 'Home',
      viewedProducts,
      featuredCategories,
      hotDeals: productsWithDiscount
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load homepage data' });
  }
});

module.exports = router;