const express = require("express");
const router = express.Router();

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


const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// const loadHomepage = async (req, res) => {
//   try {
//     const homeCategory = await Category.find({ isListed: true }).select('_id');

//     if (!homeCategory) {
//       return res.status(404).send("Category products not found");
//     }

//     const products = await Product.find({ isBlocked: false});

//     res.render("home", { products });
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).send("Error fetching products");
//   }
// };


const loadHomepage = async (req, res) => {
  try {
    // Find listed categories
    const listedCategories = await Category.find({ isListed: true }).select('_id');
    console.log("Listed categories:", listedCategories);

    if (!listedCategories || listedCategories.length === 0) {

      console.log('no categories are listed')
      res.render('home',{products:[]})
    }

    // Find products that are not blocked and belong to listed categories
    const products = await Product.find({
      isBlocked: false,
      category: { $in: listedCategories.map(cat => cat._id) },
    }).populate('category'); // Optionally populate category

    console.log("Filtered products:", products);

    // Render the homepage with the filtered products
    res.render("home", { products });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    console.error("Stack trace:", error.stack);
    res.render('home',{products:[]})
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
  } catch (error) {}
};

// const verifyRegister = async (req, res) => {
//   try {
//     const { name, email, password, phone } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       res.render("signUp", { error: "User already exist" });
//     } else {
//       const otp = generateOtp();
//       const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes
//       req.session.otpExpiration = otpExpiration;

//       req.session.loggedIn = true;
//       req.session.userOtp = otp;
//       req.session.userData = { name, email, password, phone };

//       req.session.save((err) => {
//         if (err) {
//           console.error("Error saving session:", err);
//           return res.status(500).send("Internal Server Error");
//         }})

//       const emailSent = sendVerificationEmail(email, otp);
//       if (!emailSent) {
//         return res.json("email-error");
//       }

   

//       //console.log(req.session.userData);

//       res.redirect("/verify");
//       console.log("OTP Sent ", otp);
//     }
//   } catch (error) {
//     console.error("Signup Error", error);
//     res.status(500).send("Internal Server Error");
//   }
// };

const loadOtpPage = (req, res) => {
  const message = req.session.errorMessage || null;
  res.render("verify-otp", { message });
};

// const verifyOtp = async (req, res) => {
//   try {
//     const otpArray = req.body.otp;
//     const otp = Array.isArray(otpArray) ? otpArray.join("") : otpArray;

//     const user = req.session.userData;
//     console.log(user)
//     if (!req.session.userData) {
//       console.error("No user data found in session.");
//       req.session.errorMessage =
//         "Session expired or invalid. Please try again.";
//       return res.render("verify-otp", { message: req.session.errorMessage });
//     }

//     // const user = req.session.userData;

//     if (Date.now() > req.session.otpExpiration) {
//       console.error("OTP has expired");
//       req.session.errorMessage = "OTP has expired. Please request a new one.";
//       return res.render("verify-otp", { message: req.session.errorMessage });
//     }

//     if (otp === req.session.userOtp) {
//       console.log("OTP matched:", otp);

//       const passwordHash = await securePassword(user.password);

//       const saveUserData = new User({
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//         password: passwordHash,
//         otp: otp,
//         otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
//       });

//       await saveUserData.save();
//       //console.log("User Saved Successfully:", saveUserData);

//       req.session.userOtp = null;
//       req.session.otpExpiration = null;
//       // req.session.userData = null;
//       req.session.user = saveUserData
//       // req.session.email =email;

//       req.session.errorMessage = "OTP verified successfully!";

//       const products = await Product.find().catch((err) => {
//         console.error("Error fetching products:", err);
//         return [];
//       });

//       return res.render("home", { products ,user:saveUserData });
//     } else {
//       console.error("Invalid OTP");
//       req.session.errorMessage = "Invalid OTP. Please try again.";
//       return res
//         .status(400)
//         .render("verify-otp", { message: req.session.errorMessage });
//     }
//   } catch (error) {
//     console.error("Error Verifying OTP:", error);
//     req.session.errorMessage =
//       "An unexpected error occurred. Please try again.";
//     return res
//       .status(500)
//       .render("verify-otp", { message: req.session.errorMessage });
//   }
// };


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


// const resendOtp = async (req, res) => {
//   try {

//     const { email } = req.session.userData;
//     if (!email) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Email not found in session" });
//     }

//     const otp = generateOtp();
//     const otpExpiration = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

//     req.session.userOtp = otp;
//     req.session.otpExpiration = otpExpiration;

//     console.log(
//       `Generated OTP: ${otp}, Expires At: ${new Date(otpExpiration)}`
//     );

//     const emailSent = await sendVerificationEmail(email, otp);
//     if (emailSent) {
//       console.log("Resend OTP :", otp);
//       res
//         .status(200)
//         .json({ success: true, message: "OTP Resend Successfully" });
//     } else {
//       res
//         .status(500)
//         .json({
//           success: false,
//           message: "Failed to resend OTP,Please try again",
//         });
//     }
//   } catch (error) {
//     console.error("Error resending OTP", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Internal Server Error,Please Try again",
//       });
//   }
// };

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



const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Input validation
    if (!name || !email || !password || !phone) {
      return res.status(400).send("All fields are required");
    }

    // Check if email already exists
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
      otpExpiration: Date.now() + 5 * 60 * 1000, // OTP expires in 5 minutes
    });

    await newUser.save();

    // Store user data in the session
    req.session.userData = { name, email, password, phone };
    req.session.userOtp = otp;
    req.session.otpExpiration = Date.now() + 5 * 60 * 1000;  // OTP expires in 5 minutes

    // Send OTP to the user's email
    await sendOTP(email, otp);

    // Save the session data
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



// const registerUser = async (req, res) => {
//   try {
//     const { name, email, password, phone } = req.body;

//     // Input validation
//     if (!name || !email || !password || !phone) {
//       return res.status(400).send("All fields are required");
//     }

//     // Check if email already exists
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
//       otpExpiration: Date.now() + 5 * 60 * 1000, // OTP expires in 5 minutes
//     });


//     await newUser.save();


//     await sendOTP(email, otp);

//     res.redirect("/verify");
//   } catch (err) {
//     console.error("Error during registration:", err);
//     res.status(500).send("Internal Server Error");
//   }
// };

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
  const  id  = req.params.id;
  console.log(id)

  try {
    const product = await Product.findOne({
      _id:id 
    });
    console.log("Product Data:", product);
    console.log(
      "Image Path:",
      product.productImage ? product.productImage[0] : "No Image"
    );

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("product-detail", { product });
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









const loadWishlist = async (req, res) => {
  try {
    return res.render("wishlist");
  } catch (error) {
    console.log("wishlist page not loading", error);
    res.status(500).send("Server error");
  }
};

const loadOrderComplete = async (req, res) => {
  const orderId = req.query.orderId;
  const userId = req.session.user;
  
  console.log('========================')

  console.log(userId)
  try {
    if (!orderId) {
      console.log("Order ID is missing");
      return res.status(400).send("Order ID is required");
    }

    const orderDetails = await Order.findOne({orderId}).populate('orderedItems.product');
    if (!orderDetails) {
      console.log("No order found for the given orderId");
      return res.status(404).send("Order not found");

    }

    console.log('________________________')
    console.log(orderDetails)

    const userDetails = await User.findOne({_id:orderDetails.userId});
    if (!userDetails) {
      console.log("User not found for the given addressId");
      return res.status(404).send("Address details not found");
    }

    
    console.log('________________________')
    console.log(userDetails)
    const addressDetails = await Address.findOne({ _id: orderDetails.address });

    if (!addressDetails) {
      console.log("Address not found for the given addressId");
      return res.status(404).send("Address details not found");
    }

    console.log('________________________')
    console.log(addressDetails)
    
    return res.render("order-complete",{orderDetails,userDetails,addressDetails});
  } catch (error) {
    console.log("order complete page not loading", error);
    res.status(500).send("Server error");
  }
};

const loadOrderCheckout = async (req, res) => {
  
    const userId=req.session.user;

    if(!userId){
      return res.redirect('/signin')
    }
    try {
      const userData = await User.findById(userId);
      
    const addressData = await Address.findOne({userId:userId})
    const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
    console.log("**************************************")
    console.log(cart.items)
    console.log("****************************************")

      console.log(addressData)


 


      const subtotal = cart.items.reduce((acc, item) => {
        return acc + item.totalPrice // Access price from the populated productId
      }, 0);

      const delivery = 50;
const total = subtotal+delivery;

    res.render("checkout", {user:userData,userAddress: addressData , cart: cart,subtotal,delivery,total});
  } catch (error) {
    console.log("checkout page not loading", error);
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

const loadForgetPassword  = async (req,res)=>{
  try {

    
  
    res.render('forgetPassword')
    
  } catch (error) {
    console.error("error occured",error)
    res.redirect('/pageNotFound');
  }
}

const updatePassword = async (req,res)=>{
  try {
    const {email , password ,confirmPassword} = req.body;
    console.log(req.body)

    const user =  await User.findOne({email})
    console.log("---------------------")
    console.log(user)

    if(!user){
      return res.json({success:false ,message: "User not found"})
    }

    if(password !== confirmPassword){
     return res.json({success:false , message :"Password donot match"})
    }


    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // 4. Update the user's password in the database (or the users array in this case)
      user.password = hashedPassword;
      await user.save();
      

      req.session.user = user._id;
       // Save user information in the session

      
        return res.json({success:true, message:'Password Updated successfully ', redirect : '/'})
    } catch (error) {
      return res.json({ success: false, message: 'Error updating password' });
    }
  

  } catch (error) {
    console.error("error updating password ",error)
    res.redirect('/pageNotFound')
  }
}


const placeOrder = async(req,res)=>{
  const userId = req.session.user;
  if (!userId) {
    return res.redirect('/signin');
  }
 try {
  const { cartId , addressId, paymentMethod } = req.body;
console.log("00000000000000000000000000000000000000000000")
console.log(addressId)
console.log(cartId)



  const cart = await Cart.findOne({userId}).populate('items.productId')
    const addressData = await Address.findOne({ userId });
console.log("---------------------------")
    console.log(cart)

    if (!cart) {
      return res.status(400).send('Invalid cart ');
    }

    if (!addressData) {
      return res.status(400).send('Invalid address ');
    }

    const orderData = {
      orderId: 'ORD' + new Date().getTime(),
      userId:userId,
      orderedItems: cart.items.map(item => ({
        product: item.productId,
        price:item.price, // Ensure populated
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
      totalPrice: cart.items.reduce((acc, item) => acc + item.totalPrice, 0),
      PayableAmount: cart.items.reduce((acc, item) => acc + item.totalPrice, 0) + 50, 
      deliveryAddress:addressData,
      paymentMethod: paymentMethod,
      address: addressData._id,

      status:'Ordered',
      placedAt: new Date(),

    }

    const newOrder = await Order.create(orderData);

     for (let item of cart.items) {
      const product = await Product.findById(item.productId);

      if (product) {

        // Decrease the stock by the ordered quantity
        product.quantity -= item.quantity;
        await product.save();
      }
    }
    await Cart.findByIdAndDelete(cart._id);

    res.redirect(`/ordercomplete?orderId=${newOrder.orderId}`)
 } catch (error) {
  console.error("Error placing order ",error)
  res.status(500).send("server error")
 }

}


// const updateAddress = async(req,res)=>{


  
//     const { addressId } = req.body;
//     console.log("}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}")
//     console.log(req.body)
  
//     if (addressId) {
//       Address.updateOne(
//         { _id: addressId },
//         { $set: { isDefault: true } })
//         .then(result => {
//           res.json({ success: true, message: 'Address updated successfully' });
//         })
//         .catch(error => {
//           console.error(error);
//           res.status(500).json({ success: false, message: 'Update failed' });
//         });
        
      
//     } else {
//       res.status(400).json({ success: false, message: 'Address ID is required' });
//     }



// }

const updateAddress = async (req, res) => {
  const { addressId } = req.body;
  const userId = req.user._id; // Assuming you get the logged-in user's ID'
  console.log('++++++++++++++++++++++++++++')
  console.log(req.body)

  if (!addressId) {
    return res.status(400).json({ success: false, message: 'Address ID is required.' });
  }

  try {
    // Set all addresses' isDefault to false for the user
    await Address.updateMany({ userId }, { $set: { isDefault: false } });

    // Set the selected address' isDefault to true
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      { $set: { isDefault: true } },
      { new: true } // Return the updated document
    );

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      address: updatedAddress, // Send back the updated address
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, message: 'Failed to update address.' });
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
  loadProductDetails,
  loadWishlist,
  loadOrderComplete,
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
};
