const express = require('express')
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const {preventBack, userAuth}  = require('../middleware/auth');
const checkBan = require('../middleware/checkban');
const profileController = require('../controllers/user/profileController');
const productController = require('../controllers/user/productController')
const cartController = require('../controllers/user/cartController')
const wishlistController = require('../controllers/user/wishlistController')
const walletController = require('../controllers/user/walletController')


 // Import your controller methods





router.get("/pageNotFound",userController.pageNotFound)
router.get("/",preventBack,userController.loadHomepage)
router.get("/signin",preventBack,userController.loadSignIn)
router.post("/signin",preventBack,userController.loginUser)
router.get('/signup',preventBack,userController.loadSignUp)
router.post('/signup',preventBack,userController.verifyRegister)
router.get('/verify',preventBack,userController.loadOtpPage)
router.post('/verify',preventBack,userController.verifyOtp)
router.get('/logout',userController.logout)

router.get('/banPage',userController.loadBanPage)
router.get('/pageError',userController.loadPageError)

router.get('/skincare',userController.loadSkincare)
router.get('/haircare',userController.loadHaircare)
router.get('/about',userController.loadAbout)
router.get('/contact',userController.loadContact)
router.get('/productdetails/:id',userController.loadProductDetails)
router.get('/cart', cartController.loadCart)
router.post('/addCart',cartController.addCart)
router.post('/updateQuantity',cartController.updateQuantity)
router.get('/deleteCart',cartController.deleteCart)
router.get('/ordercomplete',userController.loadOrderComplete)
router.get('/checkout',userController.loadOrderCheckout)
router.post('/placeOrder',userController.placeOrder)
router.post('/payWithWallet',userController.payWithWallet)

router.post('/update-profile',profileController.updateProfile)
router.get('/changePassword',profileController.loadchangePassword)
router.post("/change-password",profileController.changePassword);




router.get('/makeup',userController.getmakeupPage)
router.get('/facecare',userController.getfacecarePage)
router.get('/bodycare',userController.getbodycarePage)
router.get('/shampoo',userController.getshampooPage)
router.get('/conditioner',userController.getconditionerPage)
router.get('/serum',userController.getserumPage)
router.get('/search',productController.searchProducts)


router.get('/dashboard',userAuth,profileController.loadUserDashboard)
router.get('/myprofile',userAuth,profileController.loadUpdateProfile)
router.get('/mywallet',userAuth,walletController.loadUserWallet)
router.get('/mywalletmoney',userAuth,profileController.loadWalletAddmoney)
router.get('/mywallettransactions',userAuth,profileController.loadWalletTransactions)
router.get('/myaddressupdate',userAuth,profileController.loadUpdateUserAdress)
router.post('/resend-otp', userController.resendOtp);
router.post('/send-otp', userController.verifyOtp);
router.get('/shop',productController.loadShopPage);


// router.get('/cart/:userId/coupons',userAuth,cartController.getCoupons)
router.post('/apply-coupon',userAuth,cartController.applyCoupon)
// router.post('/remove-coupon',userAuth,cartController.removeCoupon)



router.get("/forgot-password", userController.loadForgetPassword);
router.post("/forgot-password", userController.sendOtp);
router.get("/verify-otp", userController.loadVerifyOtp);
router.post("/verify-otp", userController.passwordVerifyOtp);
router.get("/reset-password", userController.loadResetPassword);
router.post("/reset-password", userController.updatePassword);

//order management routes
router.get('/myorder',userAuth,profileController.loadUserOrder)
router.get('/myorder/:id',userAuth,profileController.loadOrderDetails)
router.post('/cancel-order', userAuth, profileController.cancelOrder);
router.post('/return-order', userAuth, profileController.returnOrder);
router.get('/generate-invoice/:orderId',userAuth,profileController.generateInvoice)
router.post("/getOrderDetails",userAuth,userController.getOrderDetails);
router.post('/orders/cancel/:orderId/:productId',userAuth,profileController.cancelSingleOrder)
router.post('/orders/return/:orderId/:productId', userAuth, profileController.returnSingleProduct);




//address management routes

router.get('/myaddress',userAuth,profileController.loadUserAddress)
router.post('/addaddress',userAuth,profileController.addNewAddress)
router.get('/editAddress',userAuth,profileController.loadEditAddress)
router.post('/editAddress/:id',userAuth,profileController.editAddress)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)
router.post('/updateAddress',userAuth,userController.updateAddress)


//wishlist
router.get('/wishlist',wishlistController.loadWishlist)
router.post('/addRemove-wishlist',wishlistController.addRemoveWishlist)
router.delete('/removeFromWishlist',wishlistController.removeFromWishlist)

router.post('/createOrder',userController.createOrder)
router.post('/verifyPayment',userController.verifyPayment)
router.get('/failedPayment',userController.loadFailedPaymentPage)


router.get('/auth/google', (req, res, next) => {
    console.log("Scopes:", ['profile', 'email']); // Log the scopes
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
        req.session.user = req.user;  // Save user info in session
        req.session.save();           // Ensure session is saved
        console.log("User saved in session:", req.session.user);
        res.redirect('/');
    }
);

















module.exports = router;