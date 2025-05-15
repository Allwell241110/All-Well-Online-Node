const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const axios = require('axios');
const Product = require('../../models/Product');
const SubCategory = require('../../models/SubCategory');

const router = express.Router();
const upload = multer();

// Upload buffer to Imgur
const uploadToImgur = async (buffer) => {
  const base64Img = buffer.toString('base64');
  console.log('Uploading image to Imgur...');
  const res = await axios.post('https://api.imgur.com/3/image', {
    image: base64Img,
    type: 'base64',
  }, {
    headers: {
      Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
    },
  });

  const { link, deletehash } = res.data.data;
  console.log('Image uploaded:', link);
  return { url: link, deleteHash: deletehash };
};

const fetchImageBuffer = async (url) => {
  console.log(`Fetching image from URL: ${url}`);
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  console.log(`Fetched image size: ${res.data.length} bytes`);
  return Buffer.from(res.data);
};

router.post('/', upload.single('csvFile'), async (req, res) => {
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
      console.log(`\nProcessing product: ${row.Name}`);

      const subCategoryName = row['Sub Category']?.trim();
      const subCategory = await SubCategory.findOne({ name: subCategoryName });
      if (!subCategory) {
        console.warn(`Subcategory "${subCategoryName}" not found. Skipping product.`);
        continue;
      }

      const productImages = [];
      for (let i = 1; i <= 4; i++) {
        const urlField = row[`Image ${i}`]?.trim();
        if (!urlField) {
          console.log(`Image ${i} is empty, skipping`);
          continue;
        }

        try {
          const buffer = await fetchImageBuffer(urlField);
          const uploaded = await uploadToImgur(buffer);
          productImages.push(uploaded);
          console.log(`Uploaded product image ${i}: ${uploaded.url}`);
        } catch (err) {
          console.error(`Image ${i} upload failed:`, err.message);
        }
      }

      // Skip product if no product image was uploaded
      if (productImages.length === 0) {
        console.warn(`No images uploaded for product "${row.Name}", skipping...`);
        continue;
      }

      const variants = [];
      for (let i = 1; i <= 5; i++) {
        const name = row[`Variant Name ${i}`]?.trim();
        if (!name) {
          console.log(`Variant ${i} has no name, skipping`);
          continue;
        }

        let variantImage = null;
        const imageUrl = row[`Variant Image ${i}`]?.trim();

        if (imageUrl) {
          try {
            const buffer = await fetchImageBuffer(imageUrl);
            variantImage = await uploadToImgur(buffer);
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
        name: row.Name?.trim(),
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

router.get('/', (req, res) => {
  res.render('products/bulkUpload', {
    title: 'Upload CSV Products',
    message: ''
  });
});

module.exports = router;