const express = require('express');
const router = express.Router();


router.get('/about', (req, res) => {
  res.render('pages/about', {title: 'About'});
});

router.get('/contact-us', (req, res) => {
    res.render('pages/contact', {title: 'Contact Us'});
  });

router.get('/faqs', (req, res) => {
    res.render('pages/faq', {title: 'FAQS'});
});

module.exports = router;