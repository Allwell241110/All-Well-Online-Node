const Product = require('../models/product');
const Category = require('../models/category');

exports.getHome = async (req, res) => {
    const products = await Product.find();
    const featuredCategories = await Category.find({ 
        parent: null, 
        name: { $nin: ['Agriculture', 'Groceries'] } 
      });
    res.render('home', {title: 'home', products, featuredCategories});
}