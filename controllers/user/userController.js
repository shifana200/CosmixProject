const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto'); // This is necessary to use createHmac
const razorpayInstance = require("../../config/razorpayConfig"); 
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const sendOTP = require("../../utils/mailSender");
const hashPassword = require("../../utils/hashPassword");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Referral = require('../../models/referralSchema')
const Coupon = require('../../models/couponSchema')


const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
    // Find listed categories
    const listedCategories = await Category.find({ isListed: true }).select('_id');
    console.log("Listed categories:", listedCategories);

    if (!listedCategories || listedCategories.length === 0) {

      console.log('no categories are listed')
      res.render('home', { products: [] })
    }

    // Find products that are not blocked and belong to listed categories
    const products = await Product.find({
      isBlocked: false,
      category: { $in: listedCategories.map(cat => cat._id) },
    }).populate('category').sort({ createdAt: -1 }).limit(4)

    console.log("Filtered products:", products);

    // Render the homepage with the filtered products
    res.render("home", { products });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    console.error("Stack trace:", error.stack);
    res.render('home', { products: [] })
  }
};


const loadSignIn = async (req, res) => {
  try {
    return res.render("signin", { message: req.session.message });
  } catch (error) {
    console.log("Signin page not loading", error);
    res.status(500).send("Server error");
  }
};

const loadSignUp = async (req, res) => {
  try {
    return res.render("signUp");
  } catch (error) {
    console.log("Register page not loading", error);
    res.status(500).send("Server error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b> Your OTP ${otp} </b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) { }
};

const loadOtpPage = (req, res) => {
  const message = req.session.errorMessage || null;
  res.render("verify-otp", { message });
};


const verifyRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.render("signUp", { error: "User already exists" });
    } else {
      const otp = generateOtp();
      const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes
      req.session.otpExpiration = otpExpiration;

      req.session.loggedIn = true;
      req.session.userOtp = otp;
      req.session.userData = { name, email, password, phone };

      // Save the session data
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).send("Internal Server Error");
        }
      });

      const emailSent = sendVerificationEmail(email, otp);
      if (!emailSent) {
        return res.json("email-error");
      }

      console.log("OTP Sent", otp);
      res.redirect("/verify");
    }
  } catch (error) {
    console.error("Signup Error", error);
    res.status(500).send("Internal Server Error");
  }
};


const verifyOtp = async (req, res) => {
  try {
    const otpArray = req.body.otp;
    const otp = Array.isArray(otpArray) ? otpArray.join("") : otpArray;

    const user = req.session.userData;  // Make sure user data is loaded from session
    if (!user) {
      console.error("No user data found in session.");
      req.session.errorMessage =
        "Session expired or invalid. Please try again.";
      return res.render("verify-otp", { message: req.session.errorMessage });
    }

    if (Date.now() > req.session.otpExpiration) {
      console.error("OTP has expired");
      req.session.errorMessage = "OTP has expired. Please request a new one.";
      return res.render("verify-otp", { message: req.session.errorMessage });
    }

    if (otp === req.session.userOtp) {
      console.log("OTP matched:", otp);

      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        otp,
        otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
      });

      await saveUserData.save();

      // Clear session OTP data after successful verification
      req.session.userOtp = null;
      req.session.otpExpiration = null;

      // Store the logged-in user in the session
      req.session.user = saveUserData;

      req.session.errorMessage = "OTP verified successfully!";

      const products = await Product.find().catch((err) => {
        console.error("Error fetching products:", err);
        return [];
      });

      return res.render("home", { products, user: saveUserData });
    } else {
      console.error("Invalid OTP");
      req.session.errorMessage = "Invalid OTP. Please try again.";
      return res.status(400).render("verify-otp", { message: req.session.errorMessage });
    }
  } catch (error) {
    console.error("Error Verifying OTP:", error);
    req.session.errorMessage =
      "An unexpected error occurred. Please try again.";
    return res
      .status(500)
      .render("verify-otp", { message: req.session.errorMessage });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    const otpExpiration = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

    req.session.userOtp = otp;
    req.session.otpExpiration = otpExpiration;

    console.log(`Generated OTP: ${otp}, Expires At: ${new Date(otpExpiration)}`);

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resent Successfully" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Failed to resend OTP, Please try again" });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error, Please Try again",
    });
  }
};

const generateReferralCode = async () => {
  let referralCode;
  let existingReferral;
  do {
    referralCode = "COSREF" + crypto.randomBytes(3).toString("hex").toUpperCase(); // Example: "COSREFA1B2C3"
    existingReferral = await Referral.findOne({ referralCode });
  } while (existingReferral); // Ensure uniqueness

  return referralCode;
};

// const registerUser = async (req, res) => {
//   try {
//     const { name, email, password, phone ,referralCode} = req.body;

//     if (!name || !email || !password || !phone) {
//       return res.status(400).send("All fields are required");
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).send("Email is already registered");
//     }

//     const otp = crypto.randomInt(100000, 999999).toString();
//     const hashedPassword = await hashPassword(password);

//     const newUser = new User({
//       name,
//       email,
//       phone,
//       password: hashedPassword,
//       otp,
//       otpExpiration: Date.now() + 5 * 60 * 1000,
//     });

//     await newUser.save(); // ✅ Save the user before using its ID for the wallet

//     // ✅ Handle referral bonus
//     if (referralCode) {
//       const referrer = await User.findOne({ referralCode });

//       if (referrer) {
//         // ✅ Update referrer and new user's wallet
//         await Wallet.findOneAndUpdate(
//           { userId: referrer._id },
//           {
//             $inc: { walletAmount: 50 },
//             $push: { transactions: { amount: 50, transactionType: "Referral" } }
//           },
//           { upsert: true, new: true }
//         );

//         await Wallet.findOneAndUpdate(
//           { userId: newUser._id },
//           {
//             $inc: { walletAmount: 50 },
//             $push: { transactions: { amount: 50, transactionType: "Referral" } }
//           },
//           { upsert: true, new: true }
//         );
//       }
//     } else {
//       // ✅ If no referral code, ensure new user still gets a wallet
//       await Wallet.findOneAndUpdate(
//         { userId: newUser._id },
//         { walletAmount: 0, transactions: [] },
//         { upsert: true, new: true }
//       );
//     }


//     // Generate and store referral code
   
// ;

//     req.session.userData = { name, email, password, phone };
//     req.session.userOtp = otp;
//     req.session.otpExpiration = Date.now() + 5 * 60 * 1000;

//     await sendOTP(email, otp);

//     req.session.save((err) => {
//       if (err) {
//         console.error("Error saving session:", err);
//         return res.status(500).send("Internal Server Error");
//       }
//     });

//     res.redirect("/verify");
//   } catch (err) {
//     console.error("Error during registration:", err);
//     res.status(500).send("Internal Server Error");
//   }
// };

// const registerUser = async (req, res) => {
//   try {
//     const { name, email, password, phone, referralCode } = req.body;

//     if (!name || !email || !password || !phone) {
//       return res.status(400).send("All fields are required");
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).send("Email is already registered");
//     }

//     const otp = crypto.randomInt(100000, 999999).toString();
//     const hashedPassword = await hashPassword(password);

//     const newUser = new User({
//       name,
//       email,
//       phone,
//       password: hashedPassword,
//       otp,
//       otpExpiration: Date.now() + 5 * 60 * 1000,
//     });

//     await newUser.save(); // ✅ Save the user before updating the wallet

//     // ✅ Handle referral bonus
//     if (referralCode) {
//       const referrer = await User.findOne({ referralCode });

//       if (referrer) {
//         console.log("✅ Referrer Found:", referrer.name);

//         // ✅ Update referrer's wallet
//         await Wallet.findOneAndUpdate(
//           { userId: referrer._id },
//           {
//             $inc: { walletAmount: 50 },
//             $push: { transactions: { amount: 50, transactionType: "Referral Bonus", date: new Date() } },
//           },
//           { upsert: true, new: true }
//         );

//         // ✅ Update new user's wallet
//         await Wallet.findOneAndUpdate(
//           { userId: newUser._id },
//           {
//             $inc: { walletAmount: 50 },
//             $push: { transactions: { amount: 50, transactionType: "Referral Bonus", date: new Date() } },
//           },
//           { upsert: true, new: true }
//         );
//       } else {
//         console.log("❌ No referrer found for this code.");
//       }
//     }

//     // ✅ Ensure new user gets a wallet even if no referral is used
//     await Wallet.findOneAndUpdate(
//       { userId: newUser._id },
//       { $setOnInsert: { walletAmount: 0, transactions: [] } }, 
//       { upsert: true }
//     );

//     req.session.userData = { name, email, password, phone };
//     req.session.userOtp = otp;
//     req.session.otpExpiration = Date.now() + 5 * 60 * 1000;

//     await sendOTP(email, otp);

//     req.session.save((err) => {
//       if (err) {
//         console.error("Error saving session:", err);
//         return res.status(500).send("Internal Server Error");
//       }
//     });

//     res.redirect("/verify");
//   } catch (err) {
//     console.error("Error during registration:", err);
//     res.status(500).send("Internal Server Error");
//   }
// };

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, referralCode } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).send("All fields are required");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email is already registered");
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpiration: Date.now() + 5 * 60 * 1000,
    });

    await newUser.save();

    // ✅ Handle referral bonus
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });

      if (referrer) {
        console.log("✅ Referrer Found:", referrer.name);

        // ✅ Update referrer's wallet
        await Wallet.findOneAndUpdate(
          { userId: referrer._id },
          {
            $inc: { walletAmount: 50 },
            $push: { transactions: { amount: 50, transactionType: "Referral Bonus", date: new Date() } },
          },
          { upsert: true, new: true }
        );

        // ✅ Update new user's wallet
        await Wallet.findOneAndUpdate(
          { userId: newUser._id },
          {
            $inc: { walletAmount: 50 },
            $push: { transactions: { amount: 50, transactionType: "Referral Bonus", date: new Date() } },
          },
          { upsert: true, new: true }
        );
      } else {
        console.log("❌ No referrer found for this code.");
      }
    }

    // ✅ Ensure new user gets a wallet even if no referral is used
    console.log("🔍 Checking wallet for:", newUser._id);
    const wallet = await Wallet.findOneAndUpdate(
      { userId: newUser._id },
      { $setOnInsert: { walletAmount: 0, transactions: [] } }, 
      { upsert: true, new: true }
    );
    console.log("✅ Wallet created:", wallet);

    req.session.userData = { name, email, password, phone };
    req.session.userOtp = otp;
    req.session.otpExpiration = Date.now() + 5 * 60 * 1000;

    await sendOTP(email, otp);

    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        return res.status(500).send("Internal Server Error");
      }
    });

    res.redirect("/verify");
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).send("Internal Server Error");
  }
};



const loginUser = async (req, res) => {
  req.session.userData = req.body;
  const { email, password } = req.body;
  //console.log(req.body);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      req.session.message = "invalid email or password.";
      return res.redirect("/signin");
    }

    if (user.isBlocked) {
      req.session.message = "This user is blocked.";
      return res.redirect("/signin");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.session.message = "Invalid password.";
      return res.redirect("/signin");
    }

    req.session.loggedIn = true;

    req.session.user = user;
    //console.log(user);
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
};

const loadSkincare = async (req, res) => {
  try {
    const skincareCategory = await Category.findOne({
      name: "Makeup",
      isListed: true,
    });

    if (!skincareCategory) {
      return res.status(404).send('Category "haircare" not found');
    }

    const products = await Product.find({ isBlocked: false });

    res.render("skincare", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const loadHaircare = async (req, res) => {
  try {
    const haircareCategory = await Category.findOne({
      description: "haircare",
      isListed: true,
    });

    if (!haircareCategory) {
      return res.status(404).send('Category "haircare" not found');
    }

    const products = await Product.find({
      category: haircareCategory._id,
      isBlocked: false,
    });

    res.render("haircare", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const loadAbout = async (req, res) => {
  try {
    return res.render("about");
  } catch (error) {
    console.log("about page not loading", error);
    res.status(500).send("Server error");
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction Error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/signin");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};

const loadContact = async (req, res) => {
  try {
    return res.render("contact");
  } catch (error) {
    console.log("contact page not loading", error);
    res.status(500).send("Server error");
  }
};

const loadProductDetails = async (req, res) => {
  const id = req.params.id;
  console.log(id)

  try {
    const product = await Product.findOne({
      _id: id
    });
   
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product }, // Exclude the current product
    }).limit(4);

    res.render("product-detail", { product, relatedProducts });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const loadBanPage = async (req, res) => {
  try {
    return res.render("banPage");
  } catch (error) {
    console.error("ban page not loading", error);
    res.status(500).send("sever error");
  }
};

const loadPageError = async (req, res) => {
  try {
    return res.render("pageError");
  } catch (error) {
    console.log("page error not loading", error);
    res.status(500).send("Server error");
  }
};

const loadOrderComplete = async (req, res) => {
  const orderId = req.query.orderId;
  const userId = req.session.user;

  console.log("___________________0_________0________");
  console.log(orderId);
  console.log(userId);

  try {
    if (!orderId) {
      console.log("Order ID is missing");
      return res.status(400).send("Order ID is required");
    }

    // Populate orderedItems.product but not addressId directly
    const orderDetails = await Order.findOne({ orderId })
      .populate('orderedItems.product') 
      .lean(); // Convert to plain JavaScript object

    if (!orderDetails) {
      console.log("No order found for the given orderId");
      return res.status(404).send("Order not found");
    }

    console.log('________________________');
    console.log(orderDetails);

    const userDetails = await User.findById(orderDetails.userId);
    if (!userDetails) {
      console.log("User not found");
      return res.status(404).send("User details not found");
    }

    console.log('________________________');
    console.log(userDetails);

    // Fetch the user's addresses
    const userAddressDoc = await Address.findOne({ userId: orderDetails.userId });

    if (!userAddressDoc) {
      console.log("Address document not found");
      return res.status(404).send("Address details not found");
    }

    // Find the specific address from the address array
    const addressDetails = userAddressDoc.address.find(addr => addr._id.toString() === orderDetails.addressId.toString());

    if (!addressDetails) {
      console.log("Address not found for the given order");
      return res.status(404).send("Address details not found");
    }

    console.log('________________________');
    console.log(addressDetails);

    return res.render("order-complete", { orderDetails, userDetails, addressDetails });

  } catch (error) {
    console.log("Order complete page not loading", error);
    res.status(500).send("Server error");
  }
};

// const loadOrderCheckout = async (req, res) => {

//   const userId = req.session.user;

//   if (!userId) {
//     return res.redirect('/signin')
//   }
//   try {
//     const userData = await User.findById(userId);

//     const addressData = await Address.findOne({ userId: userId })
//     const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
//     console.log("**************************************")
//     console.log(cart.items)
//     console.log("****************************************")

//     console.log(addressData)





//     const subtotal = cart.items.reduce((acc, item) => {
//       return acc + item.totalPrice // Access price from the populated productId
//     }, 0);

//     const delivery = 50;
//     const total = subtotal + delivery;

//     res.render("checkout", { user: userData, userAddress: addressData, cart: cart, subtotal, delivery, total });
//   } catch (error) {
//     console.log("checkout page not loading", error);
//     res.status(500).send("Server error");
//   }
// };

const loadOrderCheckout = async (req, res) => {
  const userId = req.session.user;

  if (!userId) {
      return res.redirect('/signin');
  }

  try {
      const userData = await User.findById(userId);
      const addressData = await Address.findOne({ userId });
      const cart = await Cart.findOne({ userId }).populate('items.productId');

      if (!cart || cart.items.length === 0) {
          return res.render("checkout", {
              user: userData,
              userAddress: addressData,
              cart: { items: [] },
              subtotal: 0,
              additionalCharge: 50,
              totalAmount: 50,
              discount: 0,
              appliedCoupon: null,
              coupons: [],
          });
      }

      // Calculate subtotal
      let subtotal = cart.items.reduce((total, item) => {
          return total + (item.totalPrice || 0);
      }, 0);

      if (isNaN(subtotal)) subtotal = 0;

      // Retrieve applied coupon and discount from session
      const discount = req.session.discount || 0;
      const appliedCoupon = req.session.appliedCoupon || null;
      const additionalCharge = 50;
      const totalAmount = subtotal - discount + additionalCharge;

      // Fetch active coupons
      const coupons = await Coupon.find({
          isActive: true,
          startDate: { $lte: new Date() },
          expiryDate: { $gte: new Date() },
          minimumPurchase: { $lte: subtotal },
      });

      res.render("checkout", {
          user: userData,
          userAddress: addressData,
          cart,
          subtotal,
          additionalCharge,
          totalAmount,
          discount,
          appliedCoupon,
          coupons,
      });

  } catch (error) {
      console.log("Checkout page not loading", error);
      res.status(500).send("Server error");
  }
};



const getmakeupPage = async (req, res) => {
  try {
    const makeupCategory = await Category.findOne({
      name: "Makeup",
      isListed: true,
    });

    if (!makeupCategory) {
      return res.status(404).send('Category "makeup" not found');
    }

    const products = await Product.find({
      category: makeupCategory._id,
      isBlocked: false,
    });

    res.render("makeup", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const getfacecarePage = async (req, res) => {
  try {
    const facecareCategory = await Category.findOne({
      name: "Facecare",
      isListed: true,
    });

    if (!facecareCategory) {
      return res.status(404).send('Category "facecare" not found');
    }

    const products = await Product.find({
      category: facecareCategory._id,
      isBlocked: false,
    });

    res.render("facecare", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const getbodycarePage = async (req, res) => {
  try {
    const bodycareCategory = await Category.findOne({
      name: "Bodycare",
      isListed: true,
    });

    if (!bodycareCategory) {
      return res.status(404).send('Category "bodycare" not found');
    }

    const products = await Product.find({
      category: bodycareCategory._id,
      isBlocked: false,
    });

    res.render("facecare", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const getshampooPage = async (req, res) => {
  try {
    const shampooCategory = await Category.findOne({
      name: "shampoo",
      isListed: true,
    });

    if (!shampooCategory) {
      return res.status(404).send('Category "shampoo" not found');
    }

    const products = await Product.find({
      category: shampooCategory._id,
      isBlocked: false,
    });

    res.render("shampoo", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const getconditionerPage = async (req, res) => {
  try {
    const conditionerCategory = await Category.findOne({
      name: "Conditioner",
      isListed: true,
    });

    if (!conditionerCategory) {
      return res.status(404).send('Category "conditioner" not found');
    }

    const products = await Product.find({
      category: conditionerCategory._id,
      isBlocked: false,
    });

    res.render("conditioner", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const getserumPage = async (req, res) => {
  try {
    const serumCategory = await Category.findOne({
      name: "Serum",
      isListed: true,
    });

    if (!serumCategory) {
      return res.status(404).send('Category "serum" not found');
    }

    const products = await Product.find({
      category: serumCategory._id,
      isBlocked: false,
    });

    res.render("serum", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
};

const blockUser = async (userId) => {
  try {
    await User.updateOne({ _id: userId }, { $set: { isBlocked: true } });
    console.log("User blocked successfully");
  } catch (error) {
    console.error("Error blocking user:", error);
  }
};

const loadForgetPassword = async (req, res) => {
  try {



    res.render('forgetPassword')

  } catch (error) {
    console.error("error occured", error)
    res.redirect('/pageNotFound');
  }
}

const updatePassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    console.log(req.body)

    const user = await User.findOne({ email })
    console.log("---------------------")
    console.log(user)

    if (!user) {
      return res.json({ success: false, message: "User not found" })
    }

    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Password donot match" })
    }


    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4. Update the user's password in the database (or the users array in this case)
      user.password = hashedPassword;
      await user.save();


      req.session.user = user._id;
      // Save user information in the session


      return res.json({ success: true, message: 'Password Updated successfully ', redirect: '/' })
    } catch (error) {
      return res.json({ success: false, message: 'Error updating password' });
    }


  } catch (error) {
    console.error("error updating password ", error)
    res.redirect('/pageNotFound')
  }
}

// const placeOrder = async (req, res) => {
//     const userId = req.session.user._id;
// console.log("----------------------------")
//     console.log(userId)
//     console.log("------------------------")
//     if (!userId) {
//         return res.redirect('/signin');
//     }

//     try {
//         const { cartId, paymentMethod, selectedAddress } = req.body;
//         console.log("------------------------");
//         console.log("Cart ID:", cartId);
//         console.log("Payment Method:", paymentMethod);
//         console.log("Selected Address:", selectedAddress);

//         const cart = await Cart.findOne({ _id: cartId, userId }).populate('items.productId');
// if (!cart) {
//     return res.status(400).json({ success: false, message: 'Invalid cart ID' });
// }


//         console.log("99999999999999999999999999")
//         console.log(cart)

//         const userAddressDoc = await Address.findOne({ userId });

//         console.log("))))))))))))))))))))))))))))")
//         console.log(userAddressDoc)
//         if (!userAddressDoc) {
//             return res.status(400).json({ success: false, message: "No address found for user" });
//         }

//         // Find the specific address inside the array
//         const addressData = userAddressDoc.address.find(addr => addr._id.toString() === selectedAddress.trim());
//         if (!addressData || !addressData._id) {
//             return res.status(400).json({ success: false, message: "Invalid selected address" });
//         }

//         const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

//         // Define additional charge and discount (if any)
//         const additionalCharge = 50; // This can be dynamic if you want
//         const totalAmount = subtotal + additionalCharge - discount;


//         const orderData = {
//             orderId: 'ORD' + new Date().getTime(),
//             userId: userId,
//             orderedItems: cart.items.map(item => ({
//                 product: item.productId,
//                 price: item.price, 
//                 quantity: item.quantity,
//                 totalPrice: item.totalPrice,
//             })),
//             totalPrice: subtotal,  // Total price before additional charges and discount
//             PayableAmount: totalAmount,
//             addressId: addressData._id, // ✅ Only store the ObjectId
//             paymentMethod: paymentMethod,
//             status: 'Ordered',
// razorpayPaymentStatus:"NA",
//             placedAt: new Date(),
//         };

//         const newOrder = await Order.create(orderData);

//         // Reduce stock quantity
//         for (let item of cart.items) {
//             const product = await Product.findById(item.productId);
//             if (product) {
//                 product.quantity -= item.quantity;
//                 await product.save();
//             }
//         }

//         res.status(200).json({
//           success: true,
//           orderId: newOrder.orderId
//       });
      
//         // Remove cart after order
//         await Cart.findByIdAndDelete(cart._id);

//     } catch (error) {
//         console.error("Error in placeOrder:", error);
//         res.status(500).json({ success: false, message: "Failed to place order.", error: error.message });
//     }
// };

const placeOrder = async (req, res) => {
  const userId = req.session.user._id;
  console.log("----------------------------")
  console.log(userId)
  console.log("------------------------")
  if (!userId) {
      return res.redirect('/signin');
  }

  try {
      const { cartId, paymentMethod, selectedAddress } = req.body;
      console.log("------------------------");
      console.log("Cart ID:", cartId);
      console.log("Payment Method:", paymentMethod);
      console.log("Selected Address:", selectedAddress);

      const cart = await Cart.findOne({ _id: cartId, userId }).populate('items.productId');
      if (!cart) {
          return res.status(400).json({ success: false, message: 'Invalid cart ID' });
      }

      console.log("99999999999999999999999999")
      console.log(cart)

      const userAddressDoc = await Address.findOne({ userId });

      console.log("))))))))))))))))))))))))))))")
      console.log(userAddressDoc)
      if (!userAddressDoc) {
          return res.status(400).json({ success: false, message: "No address found for user" });
      }

      // Find the specific address inside the array
      const addressData = userAddressDoc.address.find(addr => addr._id.toString() === selectedAddress.trim());
      if (!addressData || !addressData._id) {
          return res.status(400).json({ success: false, message: "Invalid selected address" });
      }

      const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

      // Get the discount from the cart document
      const discount = cart.discount || 0;  // Fetch discount from the cart or set to 0 if not found

      // Define additional charge
      const additionalCharge = 50;  // This can be dynamic if you want
      const totalAmount = subtotal + additionalCharge - discount;

      const orderData = {
          orderId: 'ORD' + new Date().getTime(),
          userId: userId,
          orderedItems: cart.items.map(item => ({
              product: item.productId,
              price: item.price, 
              quantity: item.quantity,
              totalPrice: item.totalPrice,
          })),
          totalPrice: subtotal,  // Total price before additional charges and discount
          PayableAmount: totalAmount,
          discount: discount, // Store discount in the Order document
          addressId: addressData._id, // ✅ Only store the ObjectId
          paymentMethod: paymentMethod,
          status: 'Ordered',
          razorpayPaymentStatus: "NA",
          placedAt: new Date(),
      };

      const newOrder = await Order.create(orderData);

      // Reduce stock quantity
      for (let item of cart.items) {
          const product = await Product.findById(item.productId);
          if (product) {
              product.quantity -= item.quantity;
              await product.save();
          }
      }

      res.status(200).json({
          success: true,
          orderId: newOrder.orderId
      });

      // Remove cart after order
      await Cart.findByIdAndDelete(cart._id);

  } catch (error) {
      console.error("Error in placeOrder:", error);
      res.status(500).json({ success: false, message: "Failed to place order.", error: error.message });
  }
};

const updateAddress = async (req, res) => {
  const { selectedAddressId } = req.body;
  const userId = req.session.user; // Assuming you get the logged-in user's ID'
  console.log('++++++++++++++++++++++++++++')
  console.log(req.body)
  console.log(userId)

  if (!selectedAddressId) {
    return res.status(400).json({ success: false, message: 'Address ID is required.' });
  }

  try {
    // Set all addresses' isDefault to false for the user
    await Address.updateMany(
      { userId: userId },
      { $set: { "address.$[].isDefault": false } }  // ✅ Update all elements in the array
    );
    
    // Set the selected address' isDefault to true
    const updatedAddress = await Address.findOneAndUpdate(
      { "address._id": selectedAddressId, userId: userId },  // ✅ Corrected query
      { $set: { "address.$.isDefault": true } },  // ✅ Use `$` to update the correct element
      { new: true }
    );
    

    console.log(updatedAddress)

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      addressId: updatedAddress, // Send back the updated address
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, message: 'Failed to update address.' });
  }
};

const createOrder = async (req, res) => {
  try {
      const userId = req.session.user;
      if (!userId) return res.redirect('/signin');

      const { cartId, selectedAddress, paymentMethod } = req.body;

      // Fetch Cart
      const cart = await Cart.findOne({ _id: cartId, userId }).populate('items.productId');
      if (!cart) return res.status(400).json({ success: false, message: 'Invalid cart ID' });

      // Fetch Discount from Cart
      const discount = cart.discount || 0; // Set discount to 0 if not found in the cart

      // Calculate Subtotal (Total Price before additional charges and discount)
      const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

      // Calculate Payable Amount: Subtotal + Additional Charge - Discount
      const additionalCharge = 50; // Can be dynamic if needed
      const payableAmount = subtotal + additionalCharge - discount; // Corrected Payable Amount calculation

      console.log("Subtotal:", subtotal);
      console.log("Additional Charge:", additionalCharge);
      console.log("Discount:", discount);
      console.log("Payable Amount:", payableAmount);

      // Validate Address
      const userAddressDoc = await Address.findOne({ userId });
      if (!userAddressDoc) return res.status(400).json({ success: false, message: "No address found for user" });

      const addressData = userAddressDoc.address.find(addr => addr._id.toString() === selectedAddress.trim());
      if (!addressData) return res.status(400).json({ success: false, message: "Invalid selected address" });

      // Create Razorpay Order
      const options = {
          amount: payableAmount * 100, // Amount in paise
          currency: "INR",
          receipt: 'receipt_' + new Date().getTime()
      };

      const order = await razorpayInstance.orders.create(options);
      console.log("Razorpay Order Created:", order);

      // Create New Order and Save
      const newOrder = new Order({
          orderId: 'ORD' + new Date().getTime(),
          razorpayOrderId: order.id,
          userId,
          orderedItems: cart.items.map(item => ({
              product: item.productId,
              price: item.price,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
          })),
          totalPrice: subtotal, // Total Price before additional charges and discount
          PayableAmount: payableAmount, // Final Payable Amount after adding additional charges and discount
          discount: discount, // Store discount in the Order document
          addressId: addressData._id,
          paymentMethod: paymentMethod || "Online Payment",
          status: 'Ordered', // Change from "pending" to "Ordered"
          paymentStatus: 'pending',
          razorpayPaymentStatus: 'pending',
          placedAt: new Date(),
      });

      await newOrder.save();
      console.log("New Order Saved:", newOrder);

      res.json(order);
  } catch (error) {
      console.error("Error in createOrder:", error);
      res.status(500).json({ error: error.message });
  }
};


const verifyPayment = async (req, res) => {
  try {
      const { paymentData, cartId } = req.body;

      // Find Order
      const order = await Order.findOne({ razorpayOrderId: paymentData.razorpay_order_id });
      if (!order) return res.status(400).json({ success: false, message: "Order not found!" });


      console.log("000000000000000")
      console.log(process.env.RAZORPAY_SECRET_KEY)
      // Verify Signature
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY || "UtyGDX3LSJwz3Qb7J05jyfA4");
      hmac.update(paymentData.razorpay_order_id + "|" + paymentData.razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      if (generatedSignature === paymentData.razorpay_signature) {
          order.status = "Paid";
          order.paymentStatus = "Paid";
          order.razorpayPaymentStatus = "Paid";
          order.paymentId = paymentData.razorpay_payment_id;
          await order.save();

          // Delete Cart **AFTER SUCCESSFUL PAYMENT**
          await Cart.findByIdAndDelete(cartId);

          res.json({ success: true, message: "Payment verified and order placed!", orderId: order.orderId });
      } else {
        order.status = "pending";
        order.paymentStatus = "pending";
        order.razorpayPaymentStatus = "pending";

        await order.save();

       res.status(400).json({ success: false, message: "Payment verification failed." });
      }
  } catch (error) {
      console.error("Error in verifyPayment:", error);
      res.status(500).json({ success: false, message: "Error verifying payment." });
  }
};




module.exports = {
  loadHomepage, loadSignIn,
  loadSignUp, loadOtpPage, loginUser,
  loadSkincare, loadHaircare,
  loadAbout, loadContact,
  loadProductDetails, loadOrderComplete,
  loadOrderCheckout,
  pageNotFound,
  registerUser,
  verifyOtp,
  verifyRegister,
  loadBanPage,
  resendOtp,
  logout,
  getmakeupPage,
  getfacecarePage,
  getbodycarePage,
  getshampooPage,
  getconditionerPage,
  getserumPage,
  placeOrder,
  blockUser,
  loadPageError,
  loadForgetPassword,
  updatePassword,
  updateAddress,
  createOrder,
  verifyPayment,
};
