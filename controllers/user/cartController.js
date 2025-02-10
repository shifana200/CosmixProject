const express = require("express");
const router = express.Router();
const User = require("../../models/userSchema");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')



const loadCart = async (req, res) => {
  try {
      const userId = req.session.user;

      if (!userId) {
          return res.redirect('/signin');
      }

      // Fetch the user's cart
      const cart = await Cart.findOne({ userId }).populate('items.productId');

      if (!cart || cart.items.length === 0) {
          return res.render('cart', { 
              cart: { items: [] }, 
              subtotal: 0, 
              additionalCharge: 50, 
              totalAmount: 50, 
              discount: 0, 
              appliedCoupon: null,
              couponError: req.session.couponError || null,

              coupons: [] 
          });
      }

      // Calculate subtotal from cart.items using stored totalPrice
      let subtotal = cart.items.reduce((total, item) => {
          return total + (item.totalPrice || 0);
      }, 0);

      // Ensure subtotal is a valid number
      if (isNaN(subtotal)) subtotal = 0;

      console.log("Subtotal:", subtotal);
      const coupons = await Coupon.find({
        isActive: true,
        startDate: { $lte: new Date() },
        expiryDate: { $gte: new Date() },
        minimumPurchase: { $lte: subtotal }
    });

    const discount = req.session.discount || 0;
    const appliedCoupon = req.session.appliedCoupon || null;
    const additionalCharge = 50;
    const totalAmount = subtotal - discount + additionalCharge;

    // Clear session error after displaying it
    const couponError = req.session.couponError || null;
    req.session.couponError = null;
    
    

    res.render("cart", { 
      cart, 
      subtotal, 
      additionalCharge, 
      totalAmount, 
      discount, 
      appliedCoupon, 
      couponError, 
      coupons 
  });

  } catch (error) {
      console.log("Cart page not loading", error);
      res.status(500).send("Server error");
  }
};










  const addCart = async (req, res) => {
    const userId = req.session.user;
  
    console.log("-------------------")
    console.log(userId)
  
    const {productId} = req.body;
    const quantity = 1;
    console.log(productId);
  
    try {

      if(!userId){
        return res.redirect('/signin')
      }

      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).send("Product not found");
      }
  
      
      let cart = await Cart.findOne({ userId }); 
  
      if (!cart) {
        cart = new Cart({ userId, items: [{productId,quantity,price:product.regularPrice, totalPrice: product.regularPrice * quantity}] });
      }
  
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId);
  
      if (existingItem) {
        existingItem.quantity += parseInt(quantity);
        existingItem.totalPrice = existingItem.quantity * existingItem.price;
  
      } else {
        cart.items.push({productId,
          quantity,
          price: product.regularPrice,
          totalPrice: product.regularPrice * quantity
      });
      }
  
      await cart.save();
      console.log("++++++++++++")
      console.log(cart)
  
      
      res.redirect("/cart"); 
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  };


// const updateQuantity = async(req,res)=>{
//   const userId = req.session.user;
//   try {
//     const {productId ,quantity} = req.body;
//      console.log(productId)
//      console.log(quantity)

//      const cart = await Cart.findOne({userId})


//      console.log(cart)
//      const product = cart.items.findById(productId)
//      const cart 
    
//   } catch (error) {
//     console.error(error)
//     res.redirect('/pageNotFound')
    
//   }
// }
  
const updateQuantity = async (req, res) => {
  const userId = req.session.user;
  console.log(userId)
  try {
    const { productId, quantity } = req.body;
    console.log("Product ID:", productId);
    console.log("Quantity:", quantity);

    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    // If no cart is found, return an error
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the product in the cart by productId
    const product = cart.items.find(item => item.productId.toString() === productId);

    // If the product is not found, return an error
    if (!product) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Update the quantity of the product and recalculate the totalPrice
    product.quantity = quantity;
    product.totalPrice = product.price * quantity;

    // Save the updated cart
    await cart.save();

    // Return success response with the updated cart
    res.status(200).json({ message: 'Quantity updated successfully', updatedCart: cart });
  } catch (error) {
    console.error("Error updating quantity:", error);
    res.status(500).json({ message: 'Server error' });
  }
};






  const deleteCart = async(req,res)=>{
    try {
      const cartId = req.query.id;
      const deleteCart = await Cart.updateOne({"items._id":cartId},{
        $pull:{items:{_id:cartId}}
      })
      res.redirect('/cart')
    } catch (error) {
      console.error("Error occured",error)
      res.redirect('/pageNotFound')
    }
  }

  const applyCoupon = async (req, res) => {
    try {
        const userId = req.session.user;
        const { couponCode } = req.body;

        if (!userId) {
            return res.redirect('/signin');
        }

        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            req.session.couponError = "Your cart is empty.";
            return res.redirect('/cart');
        }

        // Calculate subtotal
        let subtotal = cart.items.reduce((total, item) => total + (item.totalPrice || 0), 0);

        // Validate the coupon
        const coupon = await Coupon.findOne({
            couponCode: couponCode.trim(),
            isActive: true,
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() },
            minimumPurchase: { $lte: subtotal }
        });

        if (!coupon) {
            req.session.couponError = 'Invalid or expired coupon';
            return res.redirect('/cart'); // Redirect back to cart with an error
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (subtotal * coupon.discountValue) / 100;
        } else if (coupon.discountType === 'fixed') {
            discount = coupon.discountValue;
        }

        // Ensure discount does not exceed the subtotal
        discount = Math.min(discount, subtotal);

        // Calculate total amount
        const additionalCharge = 50;
        const totalAmount = subtotal - discount + additionalCharge;

        // Store the discount and applied coupon in session
        req.session.discount = discount;
        req.session.totalAmount = totalAmount;
        req.session.appliedCoupon = couponCode;

        cart.discount = discount;  // Add the discount to the cart document
        cart.totalPrice = subtotal;  // Update the subtotal in the cart
        cart.PayableAmount = totalAmount;

        await cart.save();

        return res.redirect('/cart'); // Redirect back to cart with updated values

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).send("Server error");
    }
};


  module.exports={
    loadCart,addCart,deleteCart,updateQuantity,applyCoupon,
  }