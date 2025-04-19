const mongoose = require('mongoose');

const metaCategorySchema = new mongoose.Schema({
  name: { type: String, required: true }
});

module.exports = mongoose.model('MetaCategory', metaCategorySchema);
