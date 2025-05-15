const express = require('express');
const router = express.Router();
const MetaCategory = require('../../models/MetaCategory');  
const MainCategory = require('../../models/MainCategory');
const SubCategory = require('../../models/SubCategory');

// POST /categories/full-create
router.post('/add', async (req, res) => {
    try {
      const { metaName, mainName, subName } = req.body;
  
      // 1. Create meta
      const meta = new MetaCategory({ name: metaName });
      await meta.save();
  
      // 2. Create main with reference to meta
      const main = new MainCategory({ name: mainName, meta: meta._id });
      await main.save();
  
      // 3. Create sub with reference to meta and main
      const sub = new SubCategory({ name: subName, meta: meta._id, main: main._id });
      await sub.save();
  
      res.redirect('/categories/constant/all-categories');
    } catch (err) {
      console.error(err);
      res.status(500).send("Something went wrong");
    }
  });


// GET Route to Render the edit meta category Form
router.get('/meta/:id/edit', async (req, res) => {
  const meta = await MetaCategory.findById(req.params.id);
  const mains = await MainCategory.find({ meta: meta._id });
  const subs = await SubCategory.find({ meta: meta._id });

  // Group subs under their respective main category
  const subsGroupedByMain = {};
  subs.forEach(sub => {
    if (!subsGroupedByMain[sub.main]) subsGroupedByMain[sub.main] = [];
    subsGroupedByMain[sub.main].push(sub);
  });

  res.render('categories/editCategoryForm', {
    meta,
    mains,
    subsGroupedByMain,
    title: 'Edit Category'
  });
});


//POST Route to Handle Updates
router.post('/meta/:id/update', async (req, res) => {
  const { metaName, mainIds = [], mainNames = [], deletedMainIds = "", subIds = {}, subNames = {} } = req.body;

  // 1. Update Meta Category
  await MetaCategory.findByIdAndUpdate(req.params.id, { name: metaName });

  // 2. Handle Main Categories and Subs
  for (let i = 0; i < mainIds.length; i++) {
    const currentMainId = mainIds[i];
    const currentMainName = mainNames[i];

    // Create new Main
    if (currentMainId === "new") {
      const newMain = await MainCategory.create({ name: currentMainName, meta: req.params.id });

      const key = Object.keys(subNames).find(k => k.startsWith("main_"));
      const subs = subNames[key] || [];
      for (let subName of subs) {
        if (subName.trim()) {
          await SubCategory.create({ name: subName, meta: req.params.id, main: newMain._id });
        }
      }

    } else {
      // Update existing Main
      await MainCategory.findByIdAndUpdate(currentMainId, { name: currentMainName });

      const subsForMain = subNames[currentMainId] || [];
      const subIdsForMain = subIds[currentMainId] || [];

      for (let j = 0; j < subsForMain.length; j++) {
        const name = subsForMain[j];
        const id = subIdsForMain[j];

        if (id === "new") {
          await SubCategory.create({ name, meta: req.params.id, main: currentMainId });
        } else {
          await SubCategory.findByIdAndUpdate(id, { name });
        }
      }
    }
  }

  // 3. Delete removed main categories
  const toDelete = deletedMainIds.split(',').filter(Boolean);
  for (let id of toDelete) {
    await SubCategory.deleteMany({ main: id });
    await MainCategory.findByIdAndDelete(id);
  }

  res.redirect('/categories/constant/all-categories');
});

router.get('/main-categories/:metaCategoryId', async (req, res) => {
  const { metaCategoryId } = req.params;

  console.log('Received request for metaCategoryId:', metaCategoryId);

  try {
    const categories = await MainCategory.find({ meta: metaCategoryId });

    console.log(`Found ${categories.length} main categories for metaCategoryId ${metaCategoryId}`);
    categories.forEach(cat => {
      console.log(` - Category: ${cat.name} (ID: ${cat._id})`);
    });

    res.render('categories/user/mainCategories', {
      categories,
      main: true,
      title: 'Main Categories'
    });
  } catch (err) {
    console.error('Error fetching main categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/sub-categories/:mainCategoryId', async (req, res) => {
  try {
    const mainCategoryId = req.params.mainCategoryId;
    console.log('Main Category ID:', mainCategoryId);

    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const searchQuery = req.query.search || '';
    const sort = req.query.sort || 'newest';
    const skip = (page - 1) * limit;

    console.log('Page:', page, 'Limit:', limit, 'Search Query:', searchQuery, 'Sort:', sort);

    // Sorting
    const sortOptions = {};
    if (sort === 'price-asc') sortOptions.price = 1;
    else if (sort === 'price-desc') sortOptions.price = -1;
    else sortOptions.createdAt = -1;

    console.log('Sort Options:', sortOptions);

    // Step 1: Get all subcategories for this main category
    const subcategories = await SubCategory.find({ main: mainCategoryId });
    console.log('Fetched Subcategories:', subcategories);

    const subCategoryIds = subcategories.map(sub => sub._id);
    console.log('Subcategory IDs:', subCategoryIds);

    // Step 2: Build product filter — corrected field name from 'subCategory' to 'category'
    const productFilter = { category: { $in: subCategoryIds } };
    if (searchQuery) {
      productFilter.name = { $regex: searchQuery, $options: 'i' };
    }

    console.log('Product Filter:', productFilter);

    // Step 3: Fetch products
    const [products, totalProducts] = await Promise.all([
      Product.find(productFilter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(productFilter)
    ]);

    console.log('Fetched Products Count:', products.length);
    console.log('Total Products Matching Filter:', totalProducts);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render('categories/user/subCategory', {
      title: 'Category Products',
      main: false,
      subcategories,
      mainCategoryProducts: products,
      searchQuery,
      sort,
      currentPage: page,
      totalPages,
      limit
    });
  } catch (err) {
    console.error('Error fetching category products:', err);
    res.status(500).send('Server error');
  }
});

const Product = require('../../models/Product');

router.get('/products/:subcategoryName', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const searchQuery = req.query.search || '';
    const sort = req.query.sort || 'newest';
    const skip = (page - 1) * limit;

    const sortOptions = {};
    if (sort === 'price-asc') sortOptions.price = 1;
    else if (sort === 'price-desc') sortOptions.price = -1;
    else sortOptions.createdAt = -1;

    // Debug logs for query params
    console.log('--- Incoming Request ---');
    console.log(`Subcategory Name: ${req.params.subcategoryName}`);
    console.log(`Page: ${page}, Limit: ${limit}, Search: "${searchQuery}", Sort: "${sort}"`);
    console.log('Sort Options:', sortOptions);

    // Step 1: Find the subcategory
    const subcategory = await SubCategory.findOne({ name: req.params.subcategoryName });
    if (!subcategory) {
      console.warn(`Subcategory not found: ${req.params.subcategoryName}`);
      return res.status(404).send('Subcategory not found');
    }
    console.log('Subcategory found:', subcategory);

    // Step 2: Build product filter
    const filter = { category: subcategory._id };
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: 'i' };
    }
    console.log('Product Filter:', filter);

    // Step 3: Fetch products and count
    const [products, totalProducts] = await Promise.all([
      Product.find(filter).sort(sortOptions).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);

    console.log(`Fetched ${products.length} products out of ${totalProducts} total`);

    const totalPages = Math.ceil(totalProducts / limit);
    console.log(`Total Pages: ${totalPages}`);

    // Step 4: Render the page
    res.render('products/products', {
      title: `${subcategory.name} Products`,
      products,
      searchQuery,
      sort,
      currentPage: page,
      totalPages,
      limit
    });
  } catch (err) {
    console.error('Error fetching subcategory products:', err);
    res.status(500).send('Server error while fetching products');
  }
});

module.exports = router;

  

