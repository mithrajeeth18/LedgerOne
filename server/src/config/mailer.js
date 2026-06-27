const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendOTPEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Money Lender App" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your PIN reset OTP',
    text: `Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\nDo not share this with anyone.`,
  });
};

module.exports = { sendOTPEmail };
