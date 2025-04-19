const mongoose = require('mongoose');

const mainCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.ObjectId, ref: 'MetaCategory', required: true }
});

module.exports = mongoose.model('MainCategory', mainCategorySchema);
