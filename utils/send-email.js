const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"All Well Enterprises" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: text || 'Please view this email in an HTML-compatible client.',
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${to}, Subject: ${subject}`);
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};

module.exports = sendEmail;