const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
  // Only set returnTo if it's not already set
  if (!req.session.returnTo && req.get('Referrer') && !req.get('Referrer').includes('/login')) {
    req.session.returnTo = req.get('Referrer');
  }

  res.render('auth/login', {
    title: 'Login',
    error: '',
    message: ''
  });
});

router.get('/sign-up', (req, res) => {
  res.render('auth/signUp',  {title: 'Sign Up', error: '', message: ''});
} );

router.get('/forgot-password', (req, res) => {
  res.render('auth/forgotPassword', {
    title: "Forgot Password",
    message: '',
    error: ''
  })
})

module.exports = router;