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

module.exports = router;

  

