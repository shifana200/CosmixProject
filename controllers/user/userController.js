const express = require('express');
const router = express.Router();


const User = require('../../models/userSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');
const env = require('dotenv').config();
const sendOTP = require('../../utils/mailSender')
const hashPassword = require('../../utils/hashPassword')
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema') // Adjust the path to your `product.js` file




const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')   
    }
}

// const loadHomepage = async (req, res) => {
//     try {
//         return res.render('home')
//     } catch (error) {
//         console.log("Home page not found")
//         res.status(500).send("Server not found")
//     }
// }


const loadHomepage = async (req, res) => {
    try {
        
        const homeCategory = await Category.findOne({ isListed:true });

        if (!homeCategory) {
            return res.status(404).send('Category products not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({isBlocked:false});

        // Step 3: Render the page with the products
        res.render('home', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};

const loadSignIn = async (req, res) => {
    try {
        return res.render('signin',{message:req.session.message})
    } catch (error) {
        console.log("Signin page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadSignUp = async (req, res) => {
    try {
        return res.render('signUp')
    } catch (error) {
        console.log("Register page not loading", error)
        res.status(500).send('Server error')
    }
}


// OTP Generation
function generateOtp() {

    return Math.floor(100000 + Math.random() * 900000).toString()
    
}


//Send OTP 

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
                // user:"yasinputhiyara@gmail.com",
                // pass:"tteb fuqd yeug qtpu"
            }


        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b> Your OTP ${otp} </b>`
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending email", error)
        return false

    }
}


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash


    } catch (error) {

    }
};




const verifyRegister = async (req,res)=>{

    try {
        const {name ,email, password, phone } = req.body

    const existingUser = await User.findOne({email})
    if(existingUser){
        res.render('signUp',{error:"User already exist"})
    }else{
        const otp = generateOtp()
        const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes
    req.session.otpExpiration = otpExpiration;


        const emailSent = await sendVerificationEmail(email, otp)
        if (!emailSent) {
            return res.json('email-error')
        }

        req.session.loggedIn= true;
        req.session.userOtp = otp
        req.session.userData = { name, email, password, phone }
        
        console.log(req.session.userData);

        res.redirect('/verify')
        console.log("OTP Sent ", otp)
    }
    } catch (error) {
        console.error("Signup Error", error);
        res.status(500).send("Internal Server Error");
        
    }

    
}


  

// const loadOtpPage = async (req,res)=>{
//     res.render('verify-otp',{message})
// }

const loadOtpPage = (req, res) => {
    const message = req.session.errorMessage || null; // Check for a session error message or set null
    req.session.errorMessage = null; // Clear the session error
    res.render('verify-otp', { message });
};


 

const verifyOtp = async (req, res) => {
    try {
        // Get the OTP from the body (array to string if needed)
        const otpArray = req.body.otp;
        const otp = Array.isArray(otpArray) ? otpArray.join('') : otpArray;

        // Check OTP expiration
        if (Date.now() > req.session.otpExpiration) {
            console.error('OTP has expired');
            req.session.errorMessage = "OTP has expired. Please request a new one.";
            return res.render('verify-otp', { message: req.session.errorMessage });
        }

        console.log('Provided OTP:', otp);
        console.log('Session OTP:', req.session.userOtp);
        console.log('OTP Expiration:', new Date(req.session.otpExpiration));

        // Compare the OTP
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            console.log("user:", user);

            // Hash the password (ensure this function exists in your code)
            const passwordHash = await securePassword(user.password);

            // Save the user data along with OTP and OTP expiration if required
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                otp: otp, // Include OTP if required
                otpExpiration: new Date(Date.now() + 1 * 60 * 1000), // Example: Expire in 10 minutes
            });

            await saveUserData.save();
            console.log('User Saved Successfully:', saveUserData);

            // Clean up session
            req.session.userOtp = null;
            req.session.otpExpiration = null;
            req.session.userData = null;

            req.session.user = saveUserData._id;

            // Provide success message
            req.session.errorMessage = "OTP verified successfully!";
            return res.render('home'); // Show the home page or redirect
        } else {
            console.error('Invalid OTP');
            req.session.errorMessage = "Invalid OTP. Please try again.";
            return res.status(400).render('verify-otp', { message: req.session.errorMessage });
        }
    } catch (error) {
        console.error('Error Verifying OTP:', error);
        req.session.errorMessage = "An unexpected error occurred. Please try again.";
        return res.status(500).render('verify-otp', { message: req.session.errorMessage });
    }
};












const resendOtp = async(req,res)=>{
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp= otp;
        req.session.otpExpiration = otpExpiration

        console.log(`Generated OTP: ${otp}, Expires At: ${new Date(otpExpiration)}`);

        const otpExpiration = Date.now() + 1 * 60 * 1000; // OTP valid for 1 minutes
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP :",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP,Please try again"})
        }
    } catch (error) {
        console.error("Error resending OTP",error)
        res.status(500).json({success:false,message:"Internal Server Error,Please Try again"})
    }
}




const registerUser = async (req, res) => {
    try {
        const { name, email, password,phone } = req.body;

        // Input validation
        if (!name || !email || !password || !phone) {
            return res.status(400).send('All fields are required');
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email is already registered');
        }

        // Generate OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Hash the password before storing
        const hashedPassword = await hashPassword(password);

        // Save the user (without OTP expiration)
        const newUser = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            otp,
            otpExpiration: Date.now() + 1 * 60 * 1000 // OTP expires in 5 minutes
        });

        await newUser.save();

        // Send OTP to user email
        await sendOTP(email, otp);

        // Redirect to OTP verification page
        res.redirect('/verify');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Internal Server Error');
    }
};







// Controller function for login
const loginUser = async (req, res) => {
    req.session.userData = req.body
    const { email, password } = req.body;
    console.log(req.body)
  
    try {
      // Check if the user exists in the database
      const user = await User.findOne({ email });
  
      if (!user) {
        req.session.message = "invalid email or password.";
        return res.redirect("/signin"); // Redirect to signin page
      }

      if (user.isBlocked) {
        req.session.message = "This user is blocked.";
        return res.redirect("/signin"); // Redirect to signin page
    }
    
      // Compare the entered password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        req.session.message = "Invalid password.";
        return res.redirect("/signin"); // Redirect to signin page
      }
  

       // Mark the user as logged in

       req.session.loggedIn = true;
      // Save the user's session or return success response
      req.session.user = user; // If using session-based authentication
      console.log(user)
      res.redirect("/"); // Redirect to the home page
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error." });
    }
  };

  const loadSkincare = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const skincareCategory = await Category.findOne({ name: "Makeup" ,isListed: true});
         

        if (!skincareCategory) {
            return res.status(404).send('Category "haircare" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ isBlocked:false});

        // Step 3: Render the page with the products
        res.render('skincare', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};

const loadHaircare = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const haircareCategory = await Category.findOne({ description: "haircare", isListed:true });

        if (!haircareCategory) {
            return res.status(404).send('Category "haircare" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ category: haircareCategory._id ,isBlocked:false});

        // Step 3: Render the page with the products
        res.render('haircare', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};


const loadAbout =  async (req, res) => {
    try {
        return res.render('about')
    } catch (error) {
        console.log("about page not loading", error)
        res.status(500).send('Server error')
    }
}


const logout =  async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction Error",err.message);
                return res.redirect('/pageNotFound')
            }return res.redirect('/signin')
        })
    } catch (error) {
        console.log('Logout error',error);
        res.redirect('/pageNotFound')

        
    }
}

const loadContact =  async (req, res) => {
    try {
        return res.render('contact')
    } catch (error) {
        console.log("contact page not loading", error)
        res.status(500).send('Server error')
    }
}
  
const loadProductDetails=  async (req, res) => {
    const { id } = req.params;  // Extract the product ID from the URL
    
    try {
        // Fetch the product by ID
        const product = await Product.findById(id);
        console.log('Product Data:', product);
console.log('Image Path:', product.productImage ? product.productImage[0] : 'No Image');


        // If the product is not found, return a 404 page
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Render the product details page and pass the product
        res.render('product-detail', { product }); // Pass the product to the view
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const loadBanPage = async(req,res)=>{
    try {
        return res.render('banPage')
    } catch (error) {
   console.error("ban page not loading",error)
   res.status(500).send("sever error")     
    }
}

const loadCart =  async (req, res) => {
    try {
        return res.render('cart')
    } catch (error) {
        console.log("cart page not loading", error)
        res.status(500).send('Server error')
    }
}
  
const loadWishlist =  async (req, res) => {
    try {
        return res.render('wishlist')
    } catch (error) {
        console.log("wishlist page not loading", error)
        res.status(500).send('Server error')
    }
}
  
const loadOrderComplete =  async (req, res) => {
    try {
        return res.render('order-complete')
    } catch (error) {
        console.log("order complete page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadOrderCheckout =  async (req, res) => {
    try {
        return res.render('checkout')
    } catch (error) {
        console.log("checkout page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUserDashboard =  async (req, res) => {
    try {
        return res.render('userdashboard')
    } catch (error) {
        console.log("user dashboard page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUserOrder =  async (req, res) => {
    try {
        return res.render('userorders')
    } catch (error) {
        console.log("user orders page not loading", error)
        res.status(500).send('Server error')
    }
}


const loadUpdateProfile =  async (req, res) => {
    try {
        return res.render('userprofile')
    } catch (error) {
        console.log("user profile page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUserWallet =  async (req, res) => {
    try {
        return res.render('userwallet')
    } catch (error) {
        console.log("user profile page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadWalletAddmoney =  async (req, res) => {
    try {
        return res.render('walletaddmoney')
    } catch (error) {
        console.log("wallet add money page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadWalletTransactions =  async (req, res) => {
    try {
        return res.render('wallettransactionhistory')
    } catch (error) {
        console.log("wallet add money page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUserAddress =  async (req, res) => {
    try {
        return res.render('myaddress')
    } catch (error) {
        console.log("my address page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUpdateUserAdress =  async (req, res) => {
    try {
        return res.render('myaddressupdate')
    } catch (error) {
        console.log("address update page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUpdatePassword =  async (req, res) => {
    try {
        return res.render('userchangepassword')
    } catch (error) {
        console.log("update password page not loading", error)
        res.status(500).send('Server error')
    }
}

// const getmakeupPage = async (req, res) => {
//     try {
//         const products = await Product.find({ category: 'makeup' }); // Replace 'makeup' with your filter condition if needed
//         res.render('makeup', { products }); // Pass `products` to the EJS template
//     } catch (error) {
//         console.error('Error fetching products:', error);
//         res.status(500).send('Failed to load makeup products');
//     }
// };


const getmakeupPage = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const makeupCategory = await Category.findOne({ name: "Makeup" ,isListed:true});

        if (!makeupCategory) {
            return res.status(404).send('Category "makeup" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ category: makeupCategory._id ,isBlocked:false});

        // Step 3: Render the page with the products
        res.render('makeup', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};



const getfacecarePage = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const facecareCategory = await Category.findOne({ name: "Facecare",isListed:true });

        if (!facecareCategory) {
            return res.status(404).send('Category "facecare" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ category: facecareCategory._id , isBlocked:false});

        // Step 3: Render the page with the products
        res.render('facecare', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};



const getbodycarePage = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const bodycareCategory = await Category.findOne({ name: "Bodycare" , isListed:true});

        if (!bodycareCategory) {
            return res.status(404).send('Category "bodycare" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ category: bodycareCategory._id , isBlocked:false});

        // Step 3: Render the page with the products
        res.render('facecare', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};

const getshampooPage = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const shampooCategory = await Category.findOne({ name: "shampoo",isListed:true });

        if (!shampooCategory) {
            return res.status(404).send('Category "shampoo" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ category: shampooCategory._id , isBlocked:false});

        // Step 3: Render the page with the products
        res.render('shampoo', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};


const getconditionerPage = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const conditionerCategory = await Category.findOne({ name: "Conditioner" , isListed:true});

        if (!conditionerCategory) {
            return res.status(404).send('Category "conditioner" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ category: conditionerCategory._id , isBlocked:false});

        // Step 3: Render the page with the products
        res.render('conditioner', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};


const getserumPage = async (req, res) => {
    try {
        // Step 1: Fetch the ObjectId of the "makeup" category
        const serumCategory = await Category.findOne({ name: "Serum" ,isListed:true});

        if (!serumCategory) {
            return res.status(404).send('Category "serum" not found');
        }

        // Step 2: Use the category ObjectId to fetch products
        const products = await Product.find({ category: serumCategory._id ,isBlocked:false });

        // Step 3: Render the page with the products
        res.render('serum', { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
};


const blockUser = async (userId) => {
    try {
        await User.updateOne({ _id: userId }, { $set: { isBlocked: true } });
        console.log('User blocked successfully');
    } catch (error) {
        console.error('Error blocking user:', error);
    }
};


module.exports = {
    loadHomepage, loadSignIn, loadSignUp, loadOtpPage, loginUser,
    loadSkincare,loadHaircare, loadAbout, loadContact,
    loadProductDetails, loadCart, loadWishlist, loadOrderComplete,
    loadOrderCheckout, loadUserDashboard, loadUserOrder,
    loadUpdateProfile, loadWalletAddmoney, loadWalletTransactions,
    loadUpdateUserAdress, loadUserAddress, loadUpdatePassword,
    loadUserWallet,
    pageNotFound,
    registerUser,
    verifyOtp,
    verifyRegister,
   loadBanPage,
   
resendOtp,logout,
getmakeupPage,getfacecarePage,getbodycarePage,
getshampooPage,getconditionerPage,getserumPage,

blockUser,

}
