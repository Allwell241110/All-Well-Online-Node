const express = require('express');
const router = express.Router();
router.get('/add', (req, res) => {
    res.render('categories/addCategory', {title: 'Create Category'});
});
module.exports = router;
