const express = require('express');
const router = express.Router();

router.get('/add-manager', (req, res) => {
  res.render('admin/addManager');
});

module.exports = router;