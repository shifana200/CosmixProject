// const bcrypt = require('bcrypt');
// const User = require('../models/userModel');
// const OTP = require('../models/otpModel');

// exports.signup = async (req, res) => {
//   try {
//     const { name, email, password, role, otp } = req.body;

//     // Validate required fields
//     if (!name || !email || !password || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'All fields are required',
//       });
//     }

//     // Check if the user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'User already exists',
//       });
//     }

//     // Verify OTP
//     const latestOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
//     if (!latestOtp || otp !== latestOtp.otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid OTP',
//       });
//     }

//     // Hash the password
//     let hashedPassword;
//     try {
//       hashedPassword = await bcrypt.hash(password, 10);
//     } catch (error) {
//       return res.status(500).json({
//         success: false,
//         message: `Error hashing password: ${error.message}`,
//       });
//     }

//     // Create the new user
//     const newUser = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       role,
//     });

//     // Respond with success
//     return res.status(201).json({
//       success: true,
//       message: 'User registered successfully',
//       user: newUser,
//     });
//   } catch (error) {
//     console.error('Signup error:', error.message);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message,
//     });
//   }
// };
