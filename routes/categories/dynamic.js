const express = require('express');
const router = express.Router();
const MetaCategory = require('../../models/MetaCategory');  
const MainCategory = require('../../models/MainCategory');
const SubCategory = require('../../models/SubCategory');
const { isUser, isAdmin, isGuest } = require('../../middleware/auth');

// POST /categories/full-create
router.post('/add', isAdmin, async (req, res) => {
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
router.get('/meta/:id/edit', isAdmin, async (req, res) => {
  const meta = await MetaCategory.findById(req.params.id);
  const mains = await MainCategory.find({ meta: meta._id });
  const subs = await SubCategory.find({ meta: meta._id });

  // Group subs under their respective main category
  const subsGroupedByMain = {};
  subs.forEach(sub => {
    const mainId = sub.main.toString();
    if (!subsGroupedByMain[mainId]) subsGroupedByMain[mainId] = [];
    subsGroupedByMain[mainId].push(sub);
  });

  res.render('categories/editCategoryForm', {
    meta,
    mains,
    subsGroupedByMain,
    title: 'Edit Category'
  });
});


//POST Route to Handle Updates
const multer = require('multer');
const axios = require('axios');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper
const uploadToImgur = async (fileBuffer) => {
  const base64Img = fileBuffer.toString('base64');
  const res = await axios.post('https://api.imgur.com/3/image', {
    image: base64Img,
    type: 'base64',
  }, {
    headers: {
      Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
    },
  });
  const { link, deletehash } = res.data.data;
  return { url: link, deleteHash: deletehash };
};

router.post('/meta/:id/update', isAdmin, upload.any(), async (req, res) => {
  const { metaName, mainIds = [], mainNames = [], deletedMainIds = "", subIds = {}, subNames = {} } = req.body;
  await MetaCategory.findByIdAndUpdate(req.params.id, { name: metaName });

  const uploadedFiles = req.files || [];

  for (let i = 0; i < mainIds.length; i++) {
    const currentMainId = mainIds[i];
    const currentMainName = mainNames[i];

    let mainIdToUse = currentMainId;

    if (currentMainId === "new") {
      const newMain = await MainCategory.create({ name: currentMainName, meta: req.params.id });
      mainIdToUse = newMain._id;
    } else {
      await MainCategory.findByIdAndUpdate(currentMainId, { name: currentMainName });
    }

    const subIdArray = subIds[currentMainId] || [];
    const subNameArray = subNames[currentMainId] || [];
    const filesForSub = uploadedFiles.filter(f => f.fieldname === `subImages[${currentMainId}][]`);

    const existingSubs = await SubCategory.find({ main: mainIdToUse });
    const existingSubIds = existingSubs.map(s => s._id.toString());

    const submittedSubIds = subIdArray.filter(id => id !== 'new');
    const toDelete = existingSubIds.filter(id => !submittedSubIds.includes(id));
    await SubCategory.deleteMany({ _id: { $in: toDelete } });

    for (let j = 0; j < subNameArray.length; j++) {
      const subName = subNameArray[j].trim();
      const subId = subIdArray[j];
      const file = filesForSub[j];
      const image = file ? await uploadToImgur(file.buffer) : null;

      if (subId === 'new') {
        await SubCategory.create({
          name: subName,
          meta: req.params.id,
          main: mainIdToUse,
          ...(image && { image })
        });
      } else {
        const update = { name: subName };
        if (image) update.image = image;
        await SubCategory.findByIdAndUpdate(subId, update);
      }
    }
  }

  // Remove deleted main categories
  const toDeleteMainIds = deletedMainIds.split(',').filter(Boolean);
  for (let mainId of toDeleteMainIds) {
    await SubCategory.deleteMany({ main: mainId });
    await MainCategory.findByIdAndDelete(mainId);
  }

  res.redirect('/categories/constant/all-categories');
});

const logUserActivity = require('../../utils/logUserActivity');

router.get('/main-categories/:metaCategoryId', async (req, res) => {
  const { metaCategoryId } = req.params;
  const userId = req.session?.user?._id || null;
  const sessionId = req.sessionID;
  const pageUrl = req.originalUrl;
  const referrer = req.get('Referrer') || '';
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = req.ip;
  console.log('Requested metaCategoryId:', metaCategoryId);
  try {
    const categories = await MainCategory.find({ meta: metaCategoryId });

    const metaCategory = await MetaCategory.findById(metaCategoryId);
    if (!metaCategory) {
      return res.status(404).send('MetaCategory not found');
    }

    // Log the activity
    await logUserActivity({
      userId,
      sessionId,
      activityType: 'view_main_categories',
      pageUrl,
      referrer,
      userAgent,
      ipAddress,
      metadata: {
        metaCategoryId,
        resultCount: categories.length
      }
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `Main Categories under ${metaCategory.name}`,
      "mainEntity": categories.map((main) => ({
        "@type": "Thing",
        "name": main.name,
        "url": `${process.env.FRONT_END_HOST}/categories/main-categories/${main._id}`
      }))
    };

    res.render('categories/user/mainCategories', {
      structuredData,
      title: `${metaCategory.name} Main Categories - All Well Online Store`,
      metaDescription: `${metaCategory.name} Categories - All Well Online`,
      metaKeywords: `${metaCategory.name}`,
      ogTitle: `${metaCategory.name} Products - All Well Online Uganda`,
      ogDescription: `Shop ${metaCategory.name} products at All Well Online Store. Fast delivery. Great deals. Best quality in Uganda.`,
      ogUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
      ogImage: '',
      canonicalUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
      categories,
      main: true,
    });

  } catch (err) {
    console.error('Error fetching main categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/sub-categories/:mainCategoryId', async (req, res) => {
  const mainCategoryId = req.params.mainCategoryId;
  const userId = req.session?.user?._id || null;
  const sessionId = req.sessionID;
  const pageUrl = req.originalUrl;
  const referrer = req.get('Referrer') || '';
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = req.ip;

  try {
    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const searchQuery = req.query.search || '';
    const sort = req.query.sort || 'newest';
    const skip = (page - 1) * limit;

    // Sorting
    const sortOptions = {};
    if (sort === 'price-asc') sortOptions.price = 1;
    else if (sort === 'price-desc') sortOptions.price = -1;
    else sortOptions.createdAt = -1;

    // Step 1: Get all subcategories for this main category
    const subcategories = await SubCategory.find({ main: mainCategoryId });
    const subCategoryIds = subcategories.map(sub => sub._id);
    
    const mainCategory = MainCategory.findById(mainCategoryId);

    // Step 2: Build product filter
    const productFilter = { category: { $in: subCategoryIds } };
    if (searchQuery) {
      productFilter.name = { $regex: searchQuery, $options: 'i' };
    }

    // Step 3: Fetch products
    const [products, totalProducts] = await Promise.all([
      Product.find(productFilter).sort(sortOptions).skip(skip).limit(limit),
      Product.countDocuments(productFilter)
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    // Log the activity
    await logUserActivity({
      userId,
      sessionId,
      activityType: 'view_sub_categories_and_main_category_products',
      pageUrl,
      referrer,
      userAgent,
      ipAddress,
      metadata: {
        mainCategoryId,
        subCategoryCount: subcategories.length,
        productCount: products.length,
        page,
        searchQuery,
        sort
      }
    });
    
    const structuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": `Products under ${mainCategory.name}`,
  "hasPart": subcategories.map(sub => ({
    "@type": "CollectionPage",
    "name": sub.name,
    "url": `${process.env.FRONT_END_HOST}/categories/sub-categories/${sub.name}`
  }))
};
    
    res.render('categories/user/subCategory', {
      structuredData,
      title: `${mainCategory.name} Products - All Well Online Store`,
      metaDescription: `${mainCategory.name} Products - All Well Online`,
      metaKeywords: `${mainCategory.name}`,
      ogTitle: `${mainCategory.name} - All Well Online Uganda`,
      ogDescription: `Shop ${mainCategory.name} products  at All Well Online Store. Fast delivery. Great deals. Best quality in Uganda.`,
      ogUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
      ogImage: '',
      canonicalUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
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
  const userId = req.session?.user?._id || null;
  const sessionId = req.sessionID;
  const pageUrl = req.originalUrl;
  const referrer = req.get('Referrer') || '';
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = req.ip;

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

    const subcategoryName = req.params.subcategoryName;

    const subcategory = await SubCategory.findOne({ name: subcategoryName });
    if (!subcategory) {
      console.warn(`Subcategory not found: ${subcategoryName}`);
      return res.status(404).send('Subcategory not found');
    }

    const filter = { category: subcategory._id };
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: 'i' };
    }

    const [products, totalProducts] = await Promise.all([
      Product.find(filter).sort(sortOptions).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    // Log the activity
    await logUserActivity({
      userId,
      sessionId,
      activityType: 'view_products_in_subcategory',
      pageUrl,
      referrer,
      userAgent,
      ipAddress,
      metadata: {
        subcategoryName,
        subcategoryId: subcategory._id,
        productCount: products.length,
        page,
        searchQuery,
        sort
      }
    });

    const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": `Products in ${subcategory.name}`,
  "itemListElement": products.map((product, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "Product",
      "name": product.name,
      "image": product.images[0].url,
      "description": product.description,
      "sku": product.sku || product._id,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "UGX",
        "price": product.salePrice || product.price,
        "availability": "https://schema.org/InStock"
      }
    }
  }))
};

    res.render('products/products', {
      structuredData,
      title: `${subcategory.name} Products - All Well Online Store`,
      metaDescription: `${subcategory.name} Products - All Well Online`,
      metaKeywords: `${subcategory.name}`,
      ogTitle: `${subcategory.name} - All Well Online Uganda`,
      ogDescription: `Shop ${subcategory.name} products  at All Well Online Store. Fast delivery. Great deals. Best quality in Uganda.`,
      ogUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
      ogImage: subcategory.image.url,
      canonicalUrl: `${process.env.FRONT_END_HOST}${req.originalUrl}`,
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

  

