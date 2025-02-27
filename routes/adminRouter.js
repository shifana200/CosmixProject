const express = require('express')
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const couponController = require('../controllers/admin/couponController')
const offerController = require('../controllers/admin/offerController')
const orderController = require('../controllers/admin/orderController')
const dashboardController = require('../controllers/admin/dashboardController')
const {userAuth, adminAuth} = require('../middleware/auth')
const multer = require('multer');



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); 
    }
  });
  
  const uploads = multer({ storage: storage });





router.get('/pageNotFound',adminController.PageNotFound)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.logIn)
router.get('/logout',adminAuth,adminController.logout)


//dashboard management
router.get('/dashboard',adminAuth,dashboardController.loadDashboard)
router.get('/sales-report',adminAuth,dashboardController.salesReport)
router.get('/top-selling-products', dashboardController.getTopSellingProducts);
router.get('/top-selling-categories', dashboardController.getTopCategories);


//user management routes
router.get('/usermanagement',adminAuth,adminController.loadUserManagement)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)
router.get('/getUserDetails/:id',adminAuth,customerController.getUserDetails)
router.get('/searchUsers',adminAuth,customerController.searchUser)

//category management routes

router.get('/categorymanagement',adminAuth,categoryController.CategoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)
router.post('/updateCategory',adminAuth,categoryController.updateCategory)
router.get('/searchCategory',adminAuth,categoryController.searchCategory)


//product  management routes
router.get('/productmanagement',adminAuth,productController.getProducts)
router.get('/addProduct',adminAuth,productController.getaddProduct)
router.post('/addProduct',adminAuth,uploads.array("images",4),productController.addProducts)
router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unblockProduct',adminAuth,productController.unblockProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array("images",4),productController.editProduct)
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)
router.get('/searchProducts',adminAuth,productController.searchProducts)

//coupon management
router.get('/couponmanagement',adminAuth,couponController.loadCouponManagement)
router.post('/addCoupon',adminAuth,couponController.addCoupon)
router.put('/couponStatus/:id',adminAuth,couponController.couponStatus)
router.delete('/deleteCoupon/:id',adminAuth,couponController.deleteCoupon)
router.get('/getCoupon/:id',adminAuth,couponController.getCouponDetails)
router.post('/editCoupon',adminAuth,couponController.editCoupon)
router.get('/searchCoupon',adminAuth,couponController.searchCoupon)


//offer management
router.get('/offermanagement',adminAuth,offerController.loadOfferManagement)
router.post('/addOffer',adminAuth,offerController.addOffer)
router.get('/getItems',adminAuth,offerController.getItems)
router.get('/getOffer/:id',adminAuth,offerController.getOfferDetails)
router.post('/editOffer',adminAuth,offerController.updateOffer)
router.get('/getCategoriesOrProducts',adminAuth,offerController.getCategoriesOrProducts);
router.delete("/deleteOffer/:id", offerController.deleteOffer);
router.get('/searchOffer',adminAuth,offerController.searchOffer)

//order maangement
router.get('/ordermanagement',adminAuth,orderController.loadOrderManagement)
router.get('/ordermanagement/:id',adminAuth,orderController.loadOrderDetailsPage)
router.post('/updateStatus',adminAuth,orderController.updateOrderStatus)
router.get('/getOrderStatus',adminAuth,orderController.getOrderStatus)
router.post('/orderRequest', orderController.confirmOrderRequest);
router.get('/searchOrders',adminAuth,orderController.searchOrder)

module.exports = router;
