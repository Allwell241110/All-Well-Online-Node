const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
    res.render('constant/home', {title: 'home'});
});

module.exports = router;