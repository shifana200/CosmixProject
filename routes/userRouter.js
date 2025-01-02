const express = require('express')
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const {checkBlockedStatus, userAuth}  = require('../middleware/auth');
const checkBan = require('../middleware/checkban');

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

router.get('/skincare',userController.loadSkincare)
router.get('/haircare',userController.loadHaircare)
router.get('/about',userController.loadAbout)
router.get('/contact',userController.loadContact)
router.get('/productdetails/:id',userController.loadProductDetails)
router.get('/cart',userController.loadCart)
router.get('/wishlist',userController.loadWishlist)
router.get('/ordercomplete',userController.loadOrderComplete)
router.get('/checkout',userController.loadOrderCheckout)
router.post('/logout',userController.logout)




router.get('/makeup',userController.getmakeupPage)
router.get('/facecare',userController.getfacecarePage)
router.get('/bodycare',userController.getbodycarePage)

router.get('/shampoo',userController.getshampooPage)
router.get('/conditioner',userController.getconditionerPage)
router.get('/serum',userController.getserumPage)

router.get('/dashboard',userAuth,userController.loadUserDashboard)
router.get('/myorder',userAuth,userController.loadUserOrder)
router.get('/myprofile',userAuth,userController.loadUpdateProfile)
router.get('/mywallet',userAuth,userController.loadUserWallet)
router.get('/mywalletmoney',userAuth,userController.loadWalletAddmoney)
router.get('/mywallettransactions',userAuth,userController.loadWalletTransactions)
router.get('/myaddress',userAuth,userController.loadUserAddress)
router.get('/myaddressupdate',userAuth,userController.loadUpdateUserAdress)
router.get('/mypassword',userAuth,userController.loadUpdatePassword)
router.post('/resend-otp', userController.resendOtp);
router.post('/send-otp', userController.verifyOtp);

// router.get(
//     '/auth/google',
//     passport.authenticate('google', { scope: ['profile', 'email'] })
// );

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