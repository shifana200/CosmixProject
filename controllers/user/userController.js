const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto'); // This is necessary to use createHmac
const razorpayInstance = require("../../config/razorpayConfig"); 
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const hashPassword = require("../../utils/hashPassword");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Referral = require('../../models/referralSchema')
const Coupon = require('../../models/couponSchema')
const sendOTP = require("../../utils/sendEmail");
const Wallet = require('../../models/walletSchema')
const Razorpay = require("razorpay");



const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
  
    const listedCategories = await Category.find({ isListed: true }).select('_id');
    console.log("Listed categories:", listedCategories);

    if (!listedCategories || listedCategories.length === 0) {

      console.log('no categories are listed')
      res.render('home', { products: [] })
    }

    
    const products = await Product.find({
      isBlocked: false,
      category: { $in: listedCategories.map(cat => cat._id) },
    }).populate('category').sort({ createdAt: -1 }).limit(4)

    console.log("Filtered products:", products);

    
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
    const { name, email, password, phone, referralCode } = req.body;

    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("signUp", { error: "User already exists" });
    }

    
    req.session.userData = { name, email, password, phone, referralCode };

    
    const otp = generateOtp();
    req.session.userOtp = otp;
    req.session.otpExpiration = Date.now() + 5 * 60 * 1000; 

    
    const emailSent = sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email-error");
    }

    console.log("OTP Sent:", otp);

    return res.redirect("/verify");
  } catch (error) {
    console.error("Signup Error", error);
    res.status(500).send("Internal Server Error");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const otpArray = req.body.otp;
    const otp = Array.isArray(otpArray) ? otpArray.join("") : otpArray;

    const user = req.session.userData; 
    if (!user) {
      console.error("No user data found in session.");
      req.session.errorMessage = "Session expired or invalid. Please try again.";
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

      
      const newUser = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        otp,
        otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
      
      });

      if (user.googleId) { // Only add googleId if it exists
        newUser.googleId = user.googleId;
    }
    
    

      await newUser.save();

      
      req.session.userOtp = null;
      req.session.otpExpiration = null;

      
      req.session.user = newUser;
      req.session.userData = null;

    
      if (user.referralCode) {
        const referrer = await User.findOne({ referralCode: user.referralCode });

        if (referrer) {
          
          let userWallet = await Wallet.findOne({ userId: newUser._id });
          if (!userWallet) {
            userWallet = new Wallet({
              userId: newUser._id,
              walletAmount: 50,
              transactions: [{ amount: 50, transactionType: "Referral", timestamp: new Date() }],
            });
          } else {
            userWallet.walletAmount += 50;
            userWallet.transactions.push({ amount: 50, transactionType: "Referral", timestamp: new Date() });
          }
          await userWallet.save();
          console.log(`₹50 added to ${newUser.name}'s wallet for referral.`);

      
          let referrerWallet = await Wallet.findOne({ userId: referrer._id });
          if (!referrerWallet) {
            referrerWallet = new Wallet({
              userId: referrer._id,
              walletAmount: 50,
              transactions: [{ amount: 50, transactionType: "Referral", timestamp: new Date() }],
            });
          } else {
            referrerWallet.walletAmount += 50;
            referrerWallet.transactions.push({ amount: 50, transactionType: "Referral", timestamp: new Date() });
          }
          await referrerWallet.save();
          console.log(`₹50 added to ${referrer.name}'s wallet for referral.`);

          
          newUser.referredBy = referrer._id;
          await newUser.save();
        }
      }

      req.session.errorMessage = "OTP verified successfully!";

      const products = await Product.find().catch((err) => {
        console.error("Error fetching products:", err);
        return [];
      });

      return res.render("home", { products, user: newUser });
    } else {
      console.error("Invalid OTP");
      req.session.errorMessage = "Invalid OTP. Please try again.";
      return res.status(400).render("verify-otp", { message: req.session.errorMessage });
    }
  } catch (error) {
    console.error("Error Verifying OTP:", error);
    req.session.errorMessage = "An unexpected error occurred. Please try again.";
    return res.status(500).render("verify-otp", { message: req.session.errorMessage });
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


const loginUser = async (req, res) => {
  req.session.userData = req.body;
  const { email, password } = req.body;


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
  console.log(id);

  try {
    const product = await Product.findById(id).populate('offer'); 

    if (!product) {
      return res.status(404).send("Product not found");
    }

    
    if (product.offer && product.offer.status === 'Active' && product.offer.startDate <= new Date() && product.offer.endDate >= new Date()) {
      if (product.offer.discountType === 'Percentage') {
        product.offerPrice = product.regularPrice - (product.regularPrice * (product.offer.discountValue / 100));
      } else if (product.offer.discountType === 'Fixed Amount') {
        product.offerPrice = product.regularPrice - product.offer.discountValue;
      }
    } else {
    
      product.offerPrice = product.salePrice;
    }

    
    await product.save();

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
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

 

  try {
    if (!orderId) {
      console.log("Order ID is missing");
      return res.status(400).send("Order ID is required");
    }

    
    const orderDetails = await Order.findOne({ orderId })
      .populate('orderedItems.product') 
      .lean(); 

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

    
    const userAddressDoc = await Address.findOne({ userId: orderDetails.userId });

    if (!userAddressDoc) {
      console.log("Address document not found");
      return res.status(404).send("Address details not found");
    }

    
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


const loadOrderCheckout = async (req, res) => {
  const userId = req.session.user;

  if (!userId) {
      return res.redirect('/signin');
  }

  try {
      const userData = await User.findById(userId);
      const addressData = await Address.findOne({ userId }) || { address: [] }; 
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

      
      let subtotal = cart.items.reduce((total, item) => {
          return total + (item.totalPrice || 0);
      }, 0);

      if (isNaN(subtotal)) subtotal = 0;

    
      const discount = req.session.discount || 0;
      const appliedCoupon = req.session.appliedCoupon || null;
      const additionalCharge = 50;
      const totalAmount = subtotal - discount + additionalCharge;

    
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

      
      const addressData = userAddressDoc.address.find(addr => addr._id.toString() === selectedAddress.trim());
      if (!addressData || !addressData._id) {
          return res.status(400).json({ success: false, message: "Invalid selected address" });
      }

      const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

      
      const discount = cart.discount || 0; 

      
      const additionalCharge = 50;  
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
          totalPrice: subtotal,  
          PayableAmount: totalAmount,
          discount: discount, 
          addressId: addressData._id, 
          paymentMethod: paymentMethod,
          paymentStatus: 'pending',
          status: 'Ordered',
          razorpayPaymentStatus: "NA",
          placedAt: new Date(),
      };

      const newOrder = await Order.create(orderData);

      
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

      
      await Cart.findByIdAndDelete(cart._id);

  } catch (error) {
      console.error("Error in placeOrder:", error);
      res.status(500).json({ success: false, message: "Failed to place order.", error: error.message });
  }
};

const updateAddress = async (req, res) => {
  const { selectedAddressId } = req.body;
  const userId = req.session.user; 
  console.log('++++++++++++++++++++++++++++')
  console.log(req.body)
  console.log(userId)

  if (!selectedAddressId) {
    return res.status(400).json({ success: false, message: 'Address ID is required.' });
  }

  try {
    
    await Address.updateMany(
      { userId: userId },
      { $set: { "address.$[].isDefault": false } } 
    );
    
    
    const updatedAddress = await Address.findOneAndUpdate(
      { "address._id": selectedAddressId, userId: userId },
      { $set: { "address.$.isDefault": true } },  
      { new: true }
    );
    

    console.log(updatedAddress)

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      addressId: updatedAddress, 
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
          status: 'Pending', // Change from "pending" to "Ordered"
          paymentStatus: 'pending',
          razorpayPaymentStatus: 'pending',
          placedAt: new Date(),
      });

      await newOrder.save();
      console.log("New Order Saved:", newOrder);
  
    await Cart.findByIdAndDelete(cartId);


      res.json(order);
  } catch (error) {
      console.error("Error in createOrder:", error);
      res.status(500).json({ error: error.message });
  }
};


const verifyPayment = async (req, res) => {
  try {
      const { paymentData, cartId } = req.body;

      
      const order = await Order.findOne({ razorpayOrderId: paymentData.razorpay_order_id });
      if (!order) return res.status(400).json({ success: false, message: "Order not found!" });

      for (const item of order.orderedItems) {
        if (item.product.quantity < item.quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Payment failed: ${item.product.name} is out of stock.`,
                redirect: "/failedPayment"
            });
        }
    }


      console.log("000000000000000")
      console.log(process.env.RAZORPAY_SECRET_KEY)
      
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY || "UtyGDX3LSJwz3Qb7J05jyfA4");
      hmac.update(paymentData.razorpay_order_id + "|" + paymentData.razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      if (generatedSignature === paymentData.razorpay_signature) {
          order.status = "Ordered";
          order.paymentStatus = "Paid";
          order.razorpayPaymentStatus = "Paid";
          order.paymentId = paymentData.razorpay_payment_id;
          await order.save();

          for (const item of order.orderedItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.quantity -= item.quantity;
                await product.save();
            }
        }

          
          await Cart.findByIdAndDelete(cartId);

          res.json({ success: true, message: "Payment verified and order placed!", orderId: order.orderId });
      } else {
        order.status = "Pending";
        order.paymentStatus = "pending";
        order.razorpayPaymentStatus = "pending";


        await order.save();
        await Cart.findByIdAndDelete(cartId);


       res.status(400).json({ success: false, message: "Payment verification failed.",redirect:"/failedPayment" });
       
      }
  } catch (error) {
      console.error("Error in verifyPayment:", error);
      res.status(500).json({ success: false, message: "Error verifying payment." });
  }
};

const payWithWallet = async (req, res) => {
  try {
      const userId = req.session.user._id;
      if (!userId) return res.redirect('/signin');

      const { cartId, selectedAddress } = req.body;

      
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
          return res.status(400).json({ success: false, message: "Wallet not found" });
      }

      
      const cart = await Cart.findOne({ _id: cartId, userId }).populate('items.productId');
      if (!cart) return res.status(400).json({ success: false, message: "Invalid cart ID" });

      
      const discount = cart.discount || 0;
      const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
      const additionalCharge = 50;
      const payableAmount = subtotal + additionalCharge - discount;

      
      if (wallet.walletAmount < payableAmount) {
          return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
      }

    
      wallet.walletAmount -= payableAmount;

      
      wallet.transactions.push({
          amount: -payableAmount, 
          transactionType: "Wallet Payment",
      });

      await wallet.save();

      
      const userAddressDoc = await Address.findOne({ userId });
      if (!userAddressDoc) return res.status(400).json({ success: false, message: "No address found for user" });

      const addressData = userAddressDoc.address.find(addr => addr._id.toString() === selectedAddress.trim());
      if (!addressData) return res.status(400).json({ success: false, message: "Invalid selected address" });

      
      const orderData = {
          orderId: 'ORD' + new Date().getTime(),
          userId: userId,
          orderedItems: cart.items.map(item => ({
              product: item.productId,
              price: item.price,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
          })),
          totalPrice: subtotal,
          PayableAmount: payableAmount,
          discount: discount,
          addressId: addressData._id,
          paymentMethod: "Wallet",
          paymentStatus: "Paid",
          status: "Ordered",
          placedAt: new Date(),
      };

      const newOrder = await Order.create(orderData);

      
      for (let item of cart.items) {
          const product = await Product.findById(item.productId);
          if (product) {
              product.quantity -= item.quantity;
              await product.save();
          }
      }

    
      await Cart.findByIdAndDelete(cart._id);

      res.status(200).json({
          success: true,
          orderId: newOrder.orderId
      });

  } catch (error) {
      console.error("Error in payWithWallet:", error);
      res.status(500).json({ success: false, message: "Failed to process wallet payment.", error: error.message });
  }
};






const getOrderDetails = async (req, res) => {
  try {
      const { orderId } = req.body;
      const order = await Order.findOne({ orderId, paymentStatus: "pending" })
      .populate("orderedItems.product")
            .populate("userId"); 

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found or already paid" });
      }

      for (const item of order.orderedItems) {
        if (item.product.quantity < item.quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient stock for ${item.product.productName}. Available: ${item.product.quantity}, Ordered: ${item.quantity}` 
            });
        }
    }

      res.json({
          id: order.razorpayOrderId,
          amount: order.PayableAmount * 100,
          user:{
            name:order.userId.name,
            email:order.userId.email,
            contact:order.userId.phone
          }
      });

      
  } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ success: false, message: "Server error" });
  }
};



const loadForgetPassword = async (req, res) => {
  try {
    res.render("forgetPassword");
  } catch (error) {
    console.error("Error occurred", error);
    res.redirect("/pageNotFound");
  }
};



const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send("User not found")
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpiration = Date.now() + 5 * 60 * 1000; 

    console.log(`Generated OTP for ${email}:`, otp);

    await user.save();

    await sendOTP(email, otp);

    req.session.resetEmail = email;
    req.session.otpExpiration = user.otpExpiration;

    res.redirect("/verify-otp");
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.redirect("/pageNotFound");
  }
};


const loadVerifyOtp = async (req, res) => {
  res.render("verifyOtp", { message: "" });
};



const passwordVerifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.resetEmail;

    if (!email) {
      return res.redirect("/forgot-password");
    }

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || Date.now() > user.otpExpiration) {
      return res.render("verifyOtp", { message: "Invalid or expired OTP" });
    }

    user.otp = null;
    user.otpExpiration = null;
    await user.save();

    req.session.otpVerified = true;

    res.redirect("/reset-password");
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.redirect("/pageNotFound");
  }
};



const loadResetPassword = async (req, res) => {
  if (!req.session.otpVerified) {
    return res.redirect("/forgot-password");
  }
  res.render("resetPassword", { message: "" });
};



const updatePassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.resetEmail;

    if (!email) {
      return res.redirect("/forgot-password");
    }

    if (password !== confirmPassword) {
      return res.render("resetPassword", { message: "Passwords do not match" });
    }

    
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("resetPassword", { message: "User not found" });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    req.session.user = user; 
    req.session.resetEmail = null;
    req.session.otpVerified = null;

    res.redirect("/"); 
  } catch (error) {
    console.error("Error updating password:", error);
    res.redirect("/pageNotFound");
  }
};



module.exports = {
  loadHomepage,
   loadSignIn,
  loadSignUp, 
  loadOtpPage,
   loginUser,
  loadSkincare,
   loadHaircare,
  loadAbout,
   loadContact,
  loadProductDetails, loadOrderComplete,
  loadOrderCheckout,
  pageNotFound,
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
  updateAddress,
  createOrder,
  verifyPayment,
  loadForgetPassword,
  sendOtp,
  loadVerifyOtp,
  passwordVerifyOtp,
  loadResetPassword,
  updatePassword,
  getOrderDetails,payWithWallet,
};
