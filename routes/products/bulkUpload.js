const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const axios = require('axios');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

const Product = require('../../models/Product');
const SubCategory = require('../../models/SubCategory');
const { isAdmin } = require('../../middleware/auth');

const router = express.Router();
const upload = multer();

const uploadsDir = path.join(__dirname, '../../public/uploads');

// Save image to /uploads/products/ with slugified name and index
const saveImageToServer = async (buffer, originalUrl, nameSlug, index = 1) => {
  const ext = path.extname(new URL(originalUrl).pathname) || '.jpg';
  const filename = `${nameSlug}-${index}${ext}`;
  const uploadDir = path.join(uploadsDir, 'products');
  const uploadPath = path.join(uploadDir, filename);

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await fs.promises.writeFile(uploadPath, buffer);

  return {
    url: `https://www.allwellonline.shop/uploads/products/${filename}`,
    filename
  };
};

const fetchImageBuffer = async (url) => {
  console.log(`Fetching image from URL: ${url}`);
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  console.log(`Fetched image size: ${res.data.length} bytes`);
  return Buffer.from(res.data);
};

router.post('/', isAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    console.log('--- Starting CSV Import ---');
    const csvFile = req.file;
    if (!csvFile) {
      console.warn('No CSV file uploaded.');
      return res.status(400).render('products/bulkUpload', {
        message: 'CSV file is required.',
        title: 'Upload CSV Products'
      });
    }

    console.log('CSV file received:', csvFile.originalname);

    const results = [];
    await new Promise((resolve, reject) => {
      const stream = Readable.from(csvFile.buffer.toString());
      stream.pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${results.length} rows from CSV`);
    let savedCount = 0;

    for (const row of results) {
      const productName = row.Name?.trim();
      if (!productName) {
        console.warn('Product name missing, skipping row');
        continue;
      }

      const productSlug = slugify(productName, { lower: true, strict: true });
      console.log(`\nProcessing product: ${productName} (slug: ${productSlug})`);

      const subCategoryName = row['Sub Category']?.trim();
      const subCategory = await SubCategory.findOne({ name: subCategoryName });
      if (!subCategory) {
        console.warn(`Subcategory "${subCategoryName}" not found. Skipping product.`);
        continue;
      }

      // Product images
      const productImages = [];
      for (let i = 1; i <= 4; i++) {
        const imageUrl = row[`Image ${i}`]?.trim();
        if (!imageUrl) {
          console.log(`Image ${i} is empty, skipping`);
          continue;
        }

        try {
          const buffer = await fetchImageBuffer(imageUrl);
          const uploaded = await saveImageToServer(buffer, imageUrl, productSlug, i);
          productImages.push(uploaded);
          console.log(`Uploaded product image ${i}: ${uploaded.url}`);
        } catch (err) {
          console.error(`Image ${i} upload failed:`, err.message);
        }
      }

      if (productImages.length === 0) {
        console.warn(`No images uploaded for product "${productName}", skipping...`);
        continue;
      }

      // Variants
      const variants = [];
      for (let i = 1; i <= 5; i++) {
        const name = row[`Variant Name ${i}`]?.trim();
        if (!name) {
          console.log(`Variant ${i} has no name, skipping`);
          continue;
        }

        let variantImage = null;
        const variantImageUrl = row[`Variant Image ${i}`]?.trim();

        if (variantImageUrl) {
          try {
            const buffer = await fetchImageBuffer(variantImageUrl);
            variantImage = await saveImageToServer(buffer, variantImageUrl, productSlug, i);
            console.log(`Uploaded variant image ${i}: ${variantImage.url}`);
          } catch (err) {
            console.error(`Variant image ${i} upload failed:`, err.message);
          }
        }

        const price = Number(row[`Variant Price ${i}`]) || 0;
        const salePrice = Number(row[`Variant Sale Price ${i}`]) || 0;
        const stock = Number(row[`Variant Stock ${i}`]) || 0;

        console.log(`Variant ${i} - Name: ${name}, Price: ${price}, Sale: ${salePrice}, Stock: ${stock}`);

        variants.push({
          name,
          price,
          salePrice,
          stock,
          image: variantImage,
        });
      }

      const productData = {
        name: productName,
        slug: productSlug,
        description: row.Description?.trim(),
        brand: row.Brand?.trim(),
        price: Number(row['Price']) || 0,
        salePrice: Number(row['Sale Price']) || 0,
        stock: Number(row['Stock']) || 0,
        category: subCategory._id,
        images: productImages,
        variants,
      };

      console.log('Creating product:', productData.name);
      const product = new Product(productData);
      await product.save();
      savedCount++;
    }

    console.log(`All products saved successfully. Total: ${savedCount}`);

    res.status(201).render('products/bulkUpload', {
      message: `${savedCount} Products uploaded successfully.`,
      title: 'Upload CSV Products'
    });

  } catch (err) {
    console.error('CSV upload failed:', err);
    res.status(500).render('products/bulkUpload', {
      title: 'Upload CSV Products',
      message: `Failed to process CSV: ${err.message}`
    });
  }
});

router.get('/', isAdmin, (req, res) => {
  res.render('products/bulkUpload', {
    title: 'Upload CSV Products',
    message: ''
  });
});

module.exports = router;