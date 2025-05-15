const MetaCategory = require('../models/MetaCategory'); // Adjust path as needed

async function metaCategoryMiddleware(req, res, next) {
  try {
    const metaCategories = await MetaCategory.find().lean();
    res.locals.metaCategories = metaCategories;
    next();
  } catch (err) {
    console.error('Error loading meta categories:', err);
    res.locals.metaCategories = []; // Fallback to empty array
    next();
  }
}

module.exports = metaCategoryMiddleware;