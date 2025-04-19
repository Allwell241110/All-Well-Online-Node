const express = require('express');
const router = express.Router();
router.get('/add', (req, res) => {
    res.render('static/addCategory', {title: 'Create Category'});
});
module.exports = router;
