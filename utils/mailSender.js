// // const nodemailer = require('nodemailer');

// // const mailSender = async (email, title, body) => {
// //   try {
// //     // Create a Transporter to send emails
// //     let transporter = nodemailer.createTransport({
// //       host: process.env.MAIL_HOST,
// //       auth: {
// //         user: process.env.NODEMAILER_EMAIL,
// //         pass: process.env.NODEMAILER_PASSWORD,
// //       }
// //     });
// //     // Send emails to users
// //     let info = await transporter.sendMail({
// //       from: 'shifanasaleem50@gmail.com',
// //       to: email,
// //       subject: title,
// //       html: body,
// //     });
// //     console.log("Email info: ", info);
// //     return info;
// //   } catch (error) {
// //     console.log(error.message);
// //   }
// // };
// // module.exports = mailSender;


// const nodemailer = require('nodemailer');

// const sendOTP = async (email, otp) => {
//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: 'your-email@gmail.com',
//             pass: 'your-email-password'
//         }
//     });

//     const mailOptions = {
//         from: 'your-email@gmail.com',
//         to: email,
//         subject: 'OTP for Verification',
//         text: `Your OTP for verification is: ${otp}`
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log('OTP sent to:', email);
//     } catch (error) {
//         console.error('Error sending OTP:', error);
//     }
// };

// module.exports = sendOTP;
