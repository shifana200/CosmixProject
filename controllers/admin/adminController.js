const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address = require('../../models/addressSchema')

const PageNotFound = async(req,res)=>{
    res.render('Page-404')
}


const loadLogin = (req,res) =>{
    if(req.session.admin){
        return res.redirect("/dashboard")
    }res.render("login",{message:null})
}

const logIn = async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await User.findOne({ email, isAdmin: true });
      console.log(req.body);
      console.log(email);
      console.log(admin);
  
      if (admin) {
        const passwordMatch = await bcrypt.compare(password, admin.password);
  
        if (passwordMatch) {
          console.log("Password correct, redirecting");
          req.session.admin = true;
          console.log(req.session.admin);
  
          return res.render('login', {
            message: 'Login successful!',
            success: true
          });
        } else {
          return res.render('login', {
            message: 'Invalid credentials. Please try again.',
            success: false
          });
        }
      } else {
        return res.render('login', {
          message: 'Unexpected error occurred.',
          success: false
        });
      }
    } catch (error) {
      console.log("Login error", error);
      return res.redirect('/pageNotFound');
    }
  };
  


const loadUserManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
        const skip = (page - 1) * limit;


        const totalUsers = await User.countDocuments(); 
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find({})
        .skip(skip)
        .limit(limit); 
        
        res.render('usermanagement', {
            data: users, 
            totalPages: totalPages, 
            currentPage: page, 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching users.");
    }
};




 const loadProductManagement =  async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        res.render('productmanagement', { products });
    } catch (error) {
        console.error("Error fetching products", error);
        res.status(500).json({ error: "An error occurred while fetching the products." });
    }
};


const logout = async(req,res)=>{

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

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

const approveOrderRequest = async (req, res) => {
  try {
      const { orderId, approvalStatus } = req.body;

      const orderDetails = await Order.findById(orderId);

      if (!orderDetails) {
          return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (approvalStatus === 'approve') {
          if (orderDetails.status === 'Cancellation Pending') {
              orderDetails.status = 'Cancelled';

              for (let item of orderDetails.orderedItems) {
                  const product = await Product.findById(item.product);
                  if (product) {
                      product.quantity += item.quantity;
                      await product.save();
                  }
              }

              
              if (orderDetails.paymentMethod === 'Online Payment') {
                  let userWallet = await Wallet.findOne({ userId: orderDetails.userId });

                  const refundTransaction = {
                      amount: orderDetails.PayableAmount,
                      transactionType: 'Cancellation',
                      timestamp: new Date()
                  };

                  if (userWallet) {
                      userWallet.walletAmount += orderDetails.PayableAmount;
                      userWallet.transactions.push(refundTransaction);
                      await userWallet.save();
                  } else {
                      userWallet = await Wallet.create({
                          userId: orderDetails.userId,
                          walletAmount: orderDetails.PayableAmount,
                          transactions: [refundTransaction]
                      });
                  }
              }
          } else if (orderDetails.status === 'Return Pending') {
              orderDetails.status = 'Returned';

              
              if (orderDetails.paymentMethod === 'Online Payment') {
                  let userWallet = await Wallet.findOne({ userId: orderDetails.userId });

                  const refundTransaction = {
                      amount: orderDetails.PayableAmount,
                      transactionType: 'Return',
                      timestamp: new Date()
                  };

                  if (userWallet) {
                      userWallet.walletAmount += orderDetails.PayableAmount;
                      userWallet.transactions.push(refundTransaction);
                      await userWallet.save();
                  } else {
                      userWallet = await Wallet.create({
                          userId: orderDetails.userId,
                          walletAmount: orderDetails.PayableAmount,
                          transactions: [refundTransaction]
                      });
                  }
              }
          }
      } else {
          if (orderDetails.status === 'Cancellation Pending') {
              orderDetails.status = 'Ordered';
          } else if (orderDetails.status === 'Return Pending') {
              orderDetails.status = 'Delivered';
          }
      }

      await orderDetails.save();

      res.json({ success: true, message: `Order ${orderDetails.status} successfully` });

  } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
};



module.exports = {
    loadLogin,
    logIn,
    PageNotFound,
    loadUserManagement,
    loadProductManagement,
    approveOrderRequest,
    logout,
}