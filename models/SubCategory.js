const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.ObjectId, ref: 'MetaCategory', required: true },
  main: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategory', required: true },
  image: {
    url: { type: String },
    deleteHash: { type: String }
  }
});

module.exports = mongoose.model('SubCategory', subCategorySchema);