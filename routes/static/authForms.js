const express = require('express');
const router = express.Router();


router.get('/login', (req, res) => {
  res.render('auth/login', {title: 'Login'});
});

router.get('/register', (req, res) => {
    res.render('auth/register', {title: 'Register'});
  });

router.get('/forgot-password', (req, res) => {
    res.render('auth/forgotPassword', {title: 'Forgot Password'});
});

module.exports = router;