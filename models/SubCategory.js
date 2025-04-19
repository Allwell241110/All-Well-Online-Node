const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.ObjectId, ref: 'MetaCategory', required: true },
  main: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategory', required: true }
});

module.exports = mongoose.model('SubCategory', subCategorySchema);
