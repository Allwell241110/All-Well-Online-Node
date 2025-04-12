const Category = require('../models/category');

// GET all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate('parent', 'name');
    res.status(200).json(categories);
  } catch (e) {
    res.status(500).send(`Error fetching categories: ${e}`);
  }
};

// GET a single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent', 'name');
    if (!category) return res.status(404).send('Category not found');
    res.status(200).json(category);
  } catch (e) {
    res.status(500).send(`Error fetching category: ${e}`);
  }
};

// POST create a new category
exports.addCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;
    const newCategory = new Category({
      name: name.trim(),
      parent: parent || null,
    });

    await newCategory.save();
    res.status(201).json({ message: 'Category added successfully', category: newCategory });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).send('Server error');
  }
};

// PUT update an existing category
exports.updateCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name, parent: parent || null },
      { new: true }
    );

    if (!updated) return res.status(404).send('Category not found');

    res.status(200).json({ message: 'Category updated', category: updated });
  } catch (error) {
    res.status(500).send(`Error updating category: ${error}`);
  }
};

// DELETE a category
exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send('Category not found');
    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).send(`Error deleting category: ${error}`);
  }
};