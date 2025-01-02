const express = require('express')
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const {userAuth, adminAuth} = require('../middleware/auth')
const multer = require('multer');



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // specify the folder where files will be saved
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); // Generate a unique file name
    }
  });
  
  // Create an instance of multer with the storage configuration
  const uploads = multer({ storage: storage });





router.get('/pageNotFound',adminController.PageNotFound)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.logIn)
router.get('/dashboard',adminAuth,adminController.loadDashboard)

router.get('/couponmanagement',adminAuth,adminController.loadCouponManagement)
router.get('/ordermanagement',adminAuth,adminController.loadOrderManagement)
router.get('/offermanagement',adminAuth,adminController.loadOfferManagement)
router.get('/logout',adminController.logout)

//user management routes
router.get('/usermanagement',adminAuth,adminController.loadUserManagement)

router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)

router.get('/getUserDetails/:id',adminAuth,customerController.getUserDetails)

//category management routes
// router.get('/categorymanagement',adminAuth,adminController.loadCategoryManagement)
router.get('/categorymanagement',adminAuth,categoryController.CategoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)

router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)
router.post('/updateCategory',adminAuth,categoryController.updateCategory)


// router.get('/productmanagement',adminController.loadProductManagement)
router.get('/productmanagement',adminAuth,productController.getProducts)

router.get('/addProduct',adminAuth,productController.getaddProduct)
router.post('/addProduct',adminAuth,uploads.array("images",4),productController.addProducts)


router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unblockProduct',adminAuth,productController.unblockProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array('images',4),productController.editProduct)
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)
module.exports = router;
