require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'products');
const HOST = `https://allwellonline.shop/uploads/products`;
const MONGO_URI = process.env.MONGO_URI;
const THROTTLE_DELAY = parseInt(process.env.THROTTLE_DELAY_MS || '500');
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || '100');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(imgUrl, filename, attempt = 1) {
  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    const response = await axios({
      url: imgUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 15000,
      headers: {
        'User-Agent': 'MigrationScript/1.0'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`${HOST}/${filename}`));
      writer.on('error', reject);
    });

  } catch (err) {
    if (err.response?.status === 429 && attempt <= 5) {
      const wait = THROTTLE_DELAY * attempt;
      log(`⚠ 429 Too Many Requests. Retrying in ${wait}ms... (Attempt ${attempt})`);
      await delay(wait);
      return downloadImage(imgUrl, filename, attempt + 1);
    }
    throw err;
  }
}

async function migrateImages() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  await mongoose.connect(MONGO_URI);
  log('🛠 Connected to MongoDB');

  const products = await Product.find({
    $or: [
      { 'images.url': /imgur\.com/ },
      { 'variants.image.url': /imgur\.com/ }
    ]
  }).limit(BATCH_LIMIT);

  log(`🔍 Found ${products.length} products to process`);

  for (const product of products) {
    let changed = false;

    // Migrate main images
    for (let i = 0; i < product.images.length; i++) {
      const img = product.images[i];
      if (img.url?.includes('imgur.com')) {
        const ext = path.extname(new URL(img.url).pathname) || '.jpg';
        const filename = `${product._id}-img-${i}${ext}`;
        try {
          const newUrl = await downloadImage(img.url, filename);
          product.images[i].url = newUrl;
          delete product.images[i].deleteHash;
          changed = true;
          log(`✔ Migrated product image: ${img.url} → ${newUrl}`);
        } catch (err) {
          log(`✖ Failed to migrate product image: ${img.url} | ${err.message}`);
        }
        await delay(THROTTLE_DELAY);
      }
    }

    // Migrate variant images
    for (let j = 0; j < product.variants.length; j++) {
      const vImg = product.variants[j]?.image;
      if (vImg?.url?.includes('imgur.com')) {
        const ext = path.extname(new URL(vImg.url).pathname) || '.jpg';
        const filename = `${product._id}-variant-${j}${ext}`;
        try {
          const newUrl = await downloadImage(vImg.url, filename);
          product.variants[j].image.url = newUrl;
          delete product.variants[j].image.deleteHash;
          changed = true;
          log(`✔ Migrated variant image: ${vImg.url} → ${newUrl}`);
        } catch (err) {
          log(`✖ Failed to migrate variant image: ${vImg.url} | ${err.message}`);
        }
        await delay(THROTTLE_DELAY);
      }
    }

    if (changed) {
      try {
        await product.save();
        log(`💾 Saved updates for product: ${product.name}`);
      } catch (saveErr) {
        log(`✖ Error saving product ${product._id}: ${saveErr.message}`);
      }
    }
  }

  await mongoose.disconnect();
  log('✅ Migration complete. Disconnected from MongoDB.');
}

migrateImages().catch(err => {
  log(`❌ Migration script error: ${err.message}`);
  mongoose.disconnect();
});