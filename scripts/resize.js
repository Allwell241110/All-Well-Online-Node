const { Transformer } = require('@napi-rs/image');
const fs = require('fs');
const path = require('path');

const folder = path.join(__dirname, '..', 'public/uploads/products');
const width = 1200;
const height = 630;

fs.readdirSync(folder).forEach((file) => {
  const ext = path.extname(file).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png'];
  if (!allowed.includes(ext)) return;

  const filePath = path.join(folder, file);
  const buffer = fs.readFileSync(filePath);

  try {
    const transformer = new Transformer(buffer);
    
    // ❌ Don't use: transformer.resize(width, height, { fit: 'cover' });
    // ✅ Correct usage:
    transformer.resize(width, height); // this assumes default resize behavior

    let outputBuffer;
    if (ext === '.jpg' || ext === '.jpeg') {
      outputBuffer = transformer.jpegSync();
    } else if (ext === '.png') {
      outputBuffer = transformer.pngSync();
    } else {
      console.warn(`Unsupported format: ${file}`);
      return;
    }

    fs.writeFileSync(filePath, outputBuffer);
    console.log(`✔ Resized: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to resize ${file}: ${err.message}`);
  }
});