const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Product = require('../../models/productSchema')

const PageNotFound = async(req,res)=>{
    res.render('Page-404')
}


const loadLogin = (req,res) =>{
    if(req.session.admin){
        return res.redirect("/dashboard")
    }res.render("login",{message:null})
}

const logIn = async (req,res)=>{
    try {
        
const {email,password} = req.body
const admin = await User.findOne({email,isAdmin:true})
console.log(req.body)
console.log(email)
console.log(admin)

if(admin){
    const passwordMatch = await bcrypt.compare(password,admin.password)
    console.log("ankhlhlk")
if(passwordMatch){
    console.log("password correct,redirecting")
    req.session.admin = true;
    console.log(req.session.admin)

    return res.redirect("/admin/dashboard")
}else{
    return res.render('login',{message:'Invalid credentials'})
    
}
}else{
    return res.render('login',{message:'error here'})
    
}
    } catch (error) {
        console.log("login error", error)
        return res.redirect('/pageNotFound')
    }
}


const loadDashboard = async(req,res)=>{
     if(req.session.admin){
        try {
            res.render('dashboard')
        } catch (error) {
            res.redirect('/pageNotFound')
        }
    }
 }

//  const loadUserManagement = async(req,res)=>{
//     if(req.session.admin){
//        try {
//            res.render('usermanagement')
//        } catch (error) {
//            res.redirect('/pageNotFound')
//        }
//    }
// }

// Example controller function
const loadUserManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get the current page from query params, default to 1
        const limit = 5; // Number of items per page
        const skip = (page - 1) * limit;


        const totalUsers = await User.countDocuments(); // Get the total count of users
        const totalPages = Math.ceil(totalUsers / limit);


        // Use async/await with the find method
        const users = await User.find({})
        .skip(skip)
        .limit(limit); // Find all users (or you can adjust the query)
        
        // Render the usermanagement page with the user data
        res.render('usermanagement', {
            data: users, // Pass the 'users' as 'data' to the view
            totalPages: totalPages, // Example for pagination, adjust as needed
            currentPage: page, // Current page, adjust as needed
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching users.");
    }
};




 const loadProductManagement =  async (req, res) => {
    try {
        // Fetching all products, including their category (if necessary)
        const products = await Product.find().populate('category');
        // Render the productmanagement page, passing the products to be displayed
        res.render('productmanagement', { products });
    } catch (error) {
        console.error("Error fetching products", error);
        res.status(500).json({ error: "An error occurred while fetching the products." });
    }
};

const loadCouponManagement = async(req,res)=>{
    if(req.session.admin){
       try {
           res.render('couponmanagement')
       } catch (error) {
           res.redirect('/pageNotFound')
       }
   }
}

// const loadCategoryManagement = async(req,res)=>{
//      if(req.session.admin){
//        try {
//            res.render('categorymanagement')
//        } catch (error) {
//            res.redirect('/pageNotFound')
//        }
//    }
// }

const loadOrderManagement = async(req,res)=>{
    if(req.session.admin){
       try {
           res.render('ordermanagement')
       } catch (error) {
           res.redirect('/pageNotFound')
       }
   }
}

const loadOfferManagement = async(req,res)=>{
     if(req.session.admin){
       try {
           res.render('offermanagement')
       } catch (error) {
           res.redirect('/pageNotFound')
       }
   }
}

const logout = async(req,res)=>{

    res.setHeader('Cache-Control', 'no-store');

    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err);
                return res.redirect('/pageNOtFound')
            }
            res.clearCookie('connect.sid');
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("unexpected error during logout",error)
        res.redirect('/pageNotFound')
    }
}

module.exports = {
    loadLogin,
    logIn,
    loadDashboard,
    PageNotFound,
    loadUserManagement,
    loadProductManagement,
    loadCouponManagement,
    
    loadOrderManagement,
    loadOfferManagement,
    logout,


}