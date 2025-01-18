const express = require('express')
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const {checkBlockedStatus, userAuth}  = require('../middleware/auth');
const checkBan = require('../middleware/checkban');
const profileController = require('../controllers/user/profileController');
const productController = require('../controllers/user/productController')


 // Import your controller methods





router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomepage)
router.get("/signin",userController.loadSignIn)
router.post("/signin",userController.loginUser)
router.get('/signup',userController.loadSignUp)
router.post('/signup',userController.verifyRegister)
router.get('/verify',userController.loadOtpPage)
router.post('/verify',userController.verifyOtp)
router.get('/logout',userController.logout)
router.get('/banPage',userController.loadBanPage)
router.get('/pageError',userController.loadPageError)

router.get('/skincare',userController.loadSkincare)
router.get('/haircare',userController.loadHaircare)
router.get('/about',userController.loadAbout)
router.get('/contact',userController.loadContact)
router.get('/productdetails/:id',userController.loadProductDetails)
router.get('/cart',userController.loadCart)
router.post('/addCart',userController.addCart)
router.get('/deleteCart',userController.deleteCart)
router.get('/wishlist',userController.loadWishlist)
router.get('/ordercomplete',userController.loadOrderComplete)
router.get('/checkout',userController.loadOrderCheckout)
router.post('/placeOrder',userController.placeOrder)
router.post('/logout',userController.logout)
router.post('/update-profile',profileController.updateProfile)



router.get('/makeup',userController.getmakeupPage)
router.get('/facecare',userController.getfacecarePage)
router.get('/bodycare',userController.getbodycarePage)

router.get('/shampoo',userController.getshampooPage)
router.get('/conditioner',userController.getconditionerPage)
router.get('/serum',userController.getserumPage)

router.get('/dashboard',userAuth,profileController.loadUserDashboard)
router.get('/myorder',userAuth,profileController.loadUserOrder)
router.get('/myorder/:id',userAuth,profileController.loadOrderDetails)
router.get('/myprofile',userAuth,profileController.loadUpdateProfile)
router.get('/mywallet',userAuth,profileController.loadUserWallet)
router.get('/mywalletmoney',userAuth,profileController.loadWalletAddmoney)
router.get('/mywallettransactions',userAuth,profileController.loadWalletTransactions)
router.get('/myaddressupdate',userAuth,profileController.loadUpdateUserAdress)
router.post('/resend-otp', userController.resendOtp);
router.post('/send-otp', userController.verifyOtp);
router.get('/shop',productController.loadShopPage);
router.get('/shop/filter',productController.filterProducts)
router.get('/forgetPassword',userController.loadForgetPassword)
router.post('/updatePassword',userController.updatePassword)

//address management routes

router.get('/myaddress',userAuth,profileController.loadUserAddress)
router.post('/addaddress',userAuth,profileController.addNewAddress)
router.get('/editAddress',userAuth,profileController.loadEditAddress)
router.post('/editAddress/:id',userAuth,profileController.editAddress)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)
router.post('/updateAddress',userAuth,userController.updateAddress)



router.get('/auth/google', (req, res, next) => {
    console.log("Scopes:", ['profile', 'email']); // Log the scopes
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
        res.redirect('/');
    }
);

















module.exports = router;