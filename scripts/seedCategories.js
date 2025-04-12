const mongoose = require('mongoose');
const Category = require('../models/category'); // adjust path as needed
require('dotenv').config(); // Load MONGO_URI

const categories = [
  { name: "Electronics", parent: null },
  { name: "Phones & Accessories", parent: "Electronics" },
  { name: "Smartphones", parent: "Phones & Accessories" },
  { name: "Feature Phones", parent: "Phones & Accessories" },
  { name: "Chargers & Cables", parent: "Phones & Accessories" },
  { name: "Earphones & Headphones", parent: "Phones & Accessories" },

  { name: "Laptops & Computers", parent: "Electronics" },
  { name: "Laptops", parent: "Laptops & Computers" },
  { name: "Desktops", parent: "Laptops & Computers" },
  { name: "Computer Accessories", parent: "Laptops & Computers" },

  { name: "TVs & Audio", parent: "Electronics" },
  { name: "Televisions", parent: "TVs & Audio" },
  { name: "Speakers", parent: "TVs & Audio" },
  { name: "Decoders", parent: "TVs & Audio" },

  { name: "Fashion", parent: null },
  { name: "Men's Wear", parent: "Fashion" },
  { name: "Shirts", parent: "Men's Wear" },
  { name: "Trousers", parent: "Men's Wear" },
  { name: "Shoes", parent: "Men's Wear" },

  { name: "Women's Wear", parent: "Fashion" },
  { name: "Dresses", parent: "Women's Wear" },
  { name: "Tops", parent: "Women's Wear" },
  { name: "Heels", parent: "Women's Wear" },

  { name: "Kids' Fashion", parent: "Fashion" },
  { name: "Boys' Clothing", parent: "Kids' Fashion" },
  { name: "Girls' Clothing", parent: "Kids' Fashion" },

  { name: "Home & Living", parent: null },
  { name: "Furniture", parent: "Home & Living" },
  { name: "Beds", parent: "Furniture" },
  { name: "Sofas", parent: "Furniture" },

  { name: "Kitchen & Dining", parent: "Home & Living" },
  { name: "Cookware", parent: "Kitchen & Dining" },
  { name: "Plates & Cups", parent: "Kitchen & Dining" },

  { name: "Beddings", parent: "Home & Living" },
  { name: "Bed Sheets", parent: "Beddings" },
  { name: "Blankets", parent: "Beddings" },

  { name: "Groceries", parent: null },
  { name: "Cereals & Grains", parent: "Groceries" },
  { name: "Rice", parent: "Cereals & Grains" },
  { name: "Maize Flour", parent: "Cereals & Grains" },

  { name: "Fruits & Vegetables", parent: "Groceries" },
  { name: "Fruits", parent: "Fruits & Vegetables" },
  { name: "Vegetables", parent: "Fruits & Vegetables" },

  { name: "Health & Beauty", parent: null },
  { name: "Skincare", parent: "Health & Beauty" },
  { name: "Hair Care", parent: "Health & Beauty" },
  { name: "Soaps & Body Wash", parent: "Health & Beauty" },

  { name: "Medical Supplies", parent: "Health & Beauty" },
  { name: "Thermometers", parent: "Medical Supplies" },
  { name: "Face Masks", parent: "Medical Supplies" },

  { name: "Babies & Kids", parent: null },
  { name: "Baby Clothes", parent: "Babies & Kids" },
  { name: "Toys", parent: "Babies & Kids" },
  { name: "Maternity", parent: "Babies & Kids" },

  { name: "Agriculture", parent: null },
  { name: "Seeds & Seedlings", parent: "Agriculture" },
  { name: "Pesticides & Chemicals", parent: "Agriculture" },
  { name: "Farm Tools", parent: "Agriculture" },

  { name: "Livestock & Poultry", parent: "Agriculture" },
  { name: "Feeds", parent: "Livestock & Poultry" },
  { name: "Drugs & Supplements", parent: "Livestock & Poultry" }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Category.deleteMany(); // Clear existing categories
    console.log('Cleared old categories');

    const nameIdMap = {};

    // First pass: add top-level and track _ids
    for (const cat of categories) {
      if (!cat.parent) {
        const newCat = new Category({ name: cat.name });
        const saved = await newCat.save();
        nameIdMap[cat.name] = saved._id;
      }
    }

    // Second pass: add nested with resolved parent IDs
    for (const cat of categories) {
      if (cat.parent) {
        const newCat = new Category({
          name: cat.name,
          parent: nameIdMap[cat.parent] || null
        });
        const saved = await newCat.save();
        nameIdMap[cat.name] = saved._id;
      }
    }

    console.log('✅ Categories seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding categories:', err);
    process.exit(1);
  }
}

seed();