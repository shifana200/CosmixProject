// // utils/emailUtils.js
// const nodemailer = require('nodemailer');

// const sendVerificationEmail = async (otp, email) => {
//   const transporter = nodemailer.createTransport({
//     service: 'gmail', // Example, change to your email provider
//     auth: {
//       user: 'your-email@example.com',
//       pass: 'your-email-password', // Avoid hardcoding credentials in production
//     },
//   });

//   const mailOptions = {
//     from: 'your-email@example.com',
//     to: email,
//     subject: 'OTP Verification',
//     text: `Your OTP is: ${otp}`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//   } catch (error) {
//     throw new Error('Failed to send verification email');
//   }
// };

// module.exports = { sendVerificationEmail };
