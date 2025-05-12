const crypto = require('crypto');
const User = require('../../models/User');
const sendEmail = require('../../utils/send-email');
require('dotenv').config();

const express = require('express');
const router = express.Router();


router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  console.log('Received registration request:', { name, email });

  // Check if passwords match
  if (password !== confirmPassword) {
  console.warn('Registration failed: Passwords do not match');
  return res.status(400).render('auth/signUp', { 
    error: 'Passwords do not match',
    title: 'Sign Up',
    message: ''
  });
}

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
if (existingUser) {
  console.warn(`Registration failed: Email already registered - ${email}`);
  return res.status(400).render('auth/signUp', {
    error: 'Email already registered',
    title: 'Sign Up',
    message: ''
  });
}

    // Generate verification code
    const verificationCode = crypto.randomBytes(3).toString('hex');
    console.log(`Generated verification code for ${email}: ${verificationCode}`);

    // Create user
    const user = new User({
      name,
      email,
      password,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      role: 'user'
    });

    await user.save();
    console.log(`User registered successfully: ${email}`);

    // Send verification email
    const message = `Your verification code is: ${verificationCode}`;
    await sendEmail(email, 'Email Verification', message);
    console.log(`Verification email sent to ${email}`);

    res.render('auth/emailVerification', {
      message: 'User registered. Check your email for the verification code.',
      title: 'Email Verification',
      user,
      error: ''
      
    });
  } catch (error) {
    console.error(`Error registering user: ${error.message}`, error);
    res.status(500).render('auth/signUp', { error: 'Internal server error. Please try again later.' });
  }
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  console.log(`Resend verification requested for email: ${email}`);

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`Resend failed: User not found - ${email}`);
      return res.status(404).render('auth/emailVerification', { message: 'User not found',
        title: 'Email Verification'
      });
    }

    // Check if already verified
    if (user.isVerified) {
      console.info(`Resend skipped: Email already verified - ${email}`);
      return res.status(400).render('auth/emailVerification', { message: 'Email is already verified',
        title: 'Email Verification'
      });
    }

    // Generate new verification code
    const newCode = crypto.randomBytes(3).toString('hex');
    user.verificationCode = newCode;
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();
    console.log(`New verification code generated for ${email}: ${newCode}`);

    // Send the email
    const message = `Your new verification code is: ${newCode}`;
    await sendEmail(email, 'Resend Email Verification', message);
    console.log(`Verification email resent to ${email}`);

    res.render('auth/emailVerification', {
      message: 'New verification code sent. Please check your email.',
      user,
      title: 'Email Verification'
    });
  } catch (error) {
    console.error(`Error resending verification email: ${error.message}`, error);
    res.status(500).json({ message: 'Failed to resend verification email. Please try again later.' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  console.log(`Verifying Email:`, email, code);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).render('auth/emailVerification',{ message: 'User not found',
        title: 'Email Verification'
      });
    }

    if (user.isVerified) {
      return res.status(400).render('auth/emailVerification', { message: 'Email already verified',
        title: 'Email Verification'
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).render('auth/emailVerification', {
        message: 'Invalid verification code',
        title: 'Email Verification'
      });
    }

    if (user.verificationCodeExpires < Date.now()) {
      return res.status(400).render('auth/emailVerification', {
        message: 'Verification code expired',
        title: 'Email Verification'
      });
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Set session (login user after verification)
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Redirect to a protected page (e.g., products dashboard)
    res.redirect('/products');
  } catch (error) {
    console.error(error.message);
    res.status(500).render('auth/emailVerification', {
      message: `Server error: ${error.message}`,
      title: 'Email Verification'
    });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const redirectTo = req.body.redirectTo || '/';

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).render('auth/login', {
        title: 'Login',
        message: '',
        error: 'User not found',
      });
    }

    if (!user.isVerified && user.role !== 'admin') {
      return res.status(403).render('auth/login', {
        title: 'Login',
        message: '',
        error: 'Account not verified',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).render('auth/login', {
        title: 'Login',
        message: '',
        error: 'Invalid credentials',
      });
    }

    // Set session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.redirect(redirectTo);
  } catch (err) {
    console.error(err); // Useful for debugging
    return res.status(500).render('auth/login', {
      title: 'Login',
      message: '',
      error: 'Internal server error',
    });
  }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if(email) {
    console.log(email);
  }
  else {
    console.log('no email sent in the request');
  }
  

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist.' });
    }
    console.log(user.name);

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save token and expiry to the user record
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = tokenExpiry;
    console.log(user);
    await user.save();

    // Send reset link via email
    const resetUrl = `${process.env.FRONT_END_HOST}/auth/reset-password/${resetToken}`;
    const message = `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`;
    console.log('reset url:', resetUrl);

    await sendEmail(user.email, 'Password Reset Request', message);

    res.render('auth/forgotPassword', {
      title: 'Forgot Password',
      message: 'Password reset link sent to email.' });  } 
    catch (error) {
    res.status(500).json({ message: `Error requesting password reset: ${error.message}` });
  }
});

router.get('/reset-password/:token', (req, res) => {
  const { token } = req.params;

  res.render('auth/resetPassword', {
    title: 'Reset Password',
    token,
    error: '',
    message: ''
  });
});


// Reset password using token
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('auth/resetPassword', {
      title: 'Reset Password',
      token,
      error: 'Passwords do not match.',
      message: ''
    });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.render('auth/resetPassword', {
        title: 'Reset Password',
        token,
        error: 'Invalid or expired reset token.',
        message: ''
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.render('auth/resetPassword', {
      title:'Reset Password',
      token: null,
      message: 'Password reset successful. You can now log in.',
      error: ''
    });
  } catch (error) {
    res.render('auth/resetPassword', {
      title: 'Reset Password',
      token,
      error: `Error resetting password: ${error.message}`,
      message: ''
    });
  }
});


router.post('/logout', (req, res) => {
  const redirectTo = req.body.redirectTo || '/';
  
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Could not log out. Please try again.');
    }
    res.clearCookie('connect.sid');
    res.redirect(redirectTo);
  });
});


module.exports = router;