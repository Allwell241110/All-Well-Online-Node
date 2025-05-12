require('dotenv').config();
const mongoose = require('mongoose');
const District = require('../models/District');

// Complete list of 146 districts in title case
const districts = [
  "Abim", "Adjumani", "Agago", "Alebtong", "Amolatar", "Amudat", "Amuria", "Amuru", "Apac", "Arua",
  "Budaka", "Bududa", "Bugiri", "Bugweri", "Buhweju", "Buikwe", "Bukedea", "Bukomansimbi", "Bukwo",
  "Bulambuli", "Buliisa", "Bundibugyo", "Bunyangabu", "Bushenyi", "Busia", "Butaleja", "Butambala",
  "Butebo", "Buvuma", "Buyende", "Dokolo", "Gomba", "Gulu", "Hoima", "Ibanda", "Iganga", "Isingiro",
  "Jinja", "Kaabong", "Kabale", "Kabarole", "Kaberamaido", "Kagadi", "Kakumiro", "Kalaki", "Kalangala",
  "Kaliro", "Kalungu", "Kampala", "Kamuli", "Kamwenge", "Kanungu", "Kapchorwa", "Kapelebyong", "Karenga",
  "Kasanda", "Kasese", "Katakwi", "Kayunga", "Kazo", "Kibaale", "Kiboga", "Kibuku", "Kikuube", "Kiruhura",
  "Kiryandongo", "Kisoro", "Kitagwenda", "Kitgum", "Koboko", "Kole", "Kotido", "Kumi", "Kwania", "Kween",
  "Kyankwanzi", "Kyegegwa", "Kyenjojo", "Kyotera", "Lamwo", "Lira", "Luuka", "Luwero", "Lwengo",
  "Lyantonde", "Madi-Okollo", "Manafwa", "Maracha", "Masaka", "Masindi", "Mayuge", "Mbale", "Mbarara",
  "Mitooma", "Mityana", "Moroto", "Moyo", "Mpigi", "Mubende", "Mukono", "Nabilatuk", "Nakapiripirit",
  "Nakaseke", "Nakasongola", "Namayingo", "Namisindwa", "Namutumba", "Napak", "Nebbi", "Ngora",
  "Ntoroko", "Ntungamo", "Nwoya", "Obongi", "Omoro", "Otuke", "Oyam", "Pader", "Pakwach", "Pallisa",
  "Rakai", "Rubanda", "Rubirizi", "Rukiga", "Rukungiri", "Rwampara", "Sembabule", "Serere", "Sheema",
  "Sironko", "Soroti", "Tororo", "Wakiso", "Yumbe", "Zombo"
];

const seedDistricts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    // Clear existing districts
    await District.deleteMany();

    // Insert new districts
    const districtDocs = districts.map(name => ({ name }));
    await District.insertMany(districtDocs);

    console.log(`Successfully inserted ${districts.length} districts.`);
  } catch (error) {
    console.error('Error seeding districts:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
};

seedDistricts();