const express = require("express");
const router = express.Router();
const User = require("../../models/userSchema");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')
const Wishlist = require('../../models/wishlistSchema')



const loadCart = async (req, res) => {
  try {
      const userId = req.session.user;

      if (!userId) {
          return res.redirect('/signin');
      }

      const users = await User.findOne({userId})

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

      let subtotal = cart.items.reduce((total, item) => {
          return total + (item.totalPrice || 0);
      }, 0);

      if (isNaN(subtotal)) subtotal = 0;

      console.log("Subtotal:", subtotal);
      const coupons = await Coupon.find({
        isActive: true,
        startDate: { $lte: new Date() },
        expiryDate: { $gte: new Date() },
        minimumPurchase: { $lte: subtotal }, 
        $or: [
          { maximumPurchase: { $gte: subtotal } }, 
          { maximumPurchase: { $exists: false } } 
        ]
      });

    const discount = req.session.discount || 0;
    const appliedCoupon = req.session.appliedCoupon || null;
    const additionalCharge = 50;
    const totalAmount = subtotal - discount + additionalCharge;

    const couponError = req.session.couponError || null;
    req.session.couponError = null;
    
    

    res.render("cart", { 
      cart, users,
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

  console.log("-------------------");
  console.log(userId);

  const { productId } = req.body;
  const quantity = 1;
  console.log(productId);

  try {
      if (!userId) {
          return res.redirect('/signin');
      }

      const product = await Product.findById(productId);

      if (!product) {
          return res.status(404).send("Product not found");
      }

      let cart = await Cart.findOne({ userId });

      if (!cart) {
          cart = new Cart({
              userId,
              items: [{ 
                  productId, 
                  quantity, 
                  price: product.salePrice, 
                  totalPrice: product.salePrice * quantity 
              }]
          });
      }

      
        const existingItem = cart.items.find(
          (item) => item.productId.toString() === productId
        );
      


      if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.totalPrice = existingItem.quantity * existingItem.price;
      } else {
          cart.items.push({
              productId,
              quantity,
              price: product.salePrice,
              totalPrice: product.salePrice * quantity
          });
      }

      await cart.save();
      console.log("++++++++++++");
      console.log(cart);

      const wishlist = await Wishlist.findOne({ userId });

      if (wishlist && Array.isArray(wishlist.products)) {  
          const productIndex = wishlist.products.findIndex(
              (item) => item.productId.toString() === productId
          );

          if (productIndex !== -1) {
              wishlist.products.splice(productIndex, 1); 
              await wishlist.save();
              console.log("Product removed from wishlist");
          }
      }

      res.redirect("/cart");
  } catch (error) {
      console.error(" Error adding to cart:", error);
      res.status(500).send("Server error");
  }
};




const updateQuantity = async (req, res) => {
  const userId = req.session.user;
  console.log(userId)
  try {
    const { productId, quantity } = req.body;
    console.log("Product ID:", productId);
    console.log("Quantity:", quantity);

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const product = cart.items.find(item => item.productId.toString() === productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    product.quantity = quantity;
    product.totalPrice = product.price * quantity;

    await cart.save();

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

    if (!userId) {
      return res.redirect('/signin');
    }

    const { couponCode, removeCoupon } = req.body;
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
      req.session.couponError = 'Cart not found.';
      return res.redirect('/cart');
    }

    if (couponCode) {
      const coupon = await Coupon.findOne({ couponCode, isActive: true });

      if (coupon) {
        const subtotal = cart.items.reduce((total, item) => total + (item.totalPrice || 0), 0);

        if (coupon.minimumPurchase <= subtotal && (coupon.maximumPurchase >= subtotal || !coupon.maximumPurchase)) {
          const discount = coupon.discountType === 'percentage'
            ? (subtotal * coupon.discountValue) / 100
            : coupon.discountValue;

          req.session.appliedCoupon = couponCode;
          req.session.discount = discount;

          cart.appliedCoupon = couponCode;
          cart.discount = discount;
          await cart.save();

          return res.redirect('/cart');
        } else {
          req.session.couponError = 'Coupon is not valid for the current cart value.';
          return res.redirect('/cart');
        }
      } else {
        req.session.couponError = 'Invalid coupon code.';
        return res.redirect('/cart');
      }
    }

    if (removeCoupon) {
      delete req.session.appliedCoupon;
      delete req.session.discount;
      req.session.couponError = 'Coupon has been removed.';

      cart.appliedCoupon = null;
      cart.discount = 0;
      await cart.save();

      return res.redirect('/cart');
    }

    return res.redirect('/cart');
  } catch (error) {
    console.log('Error applying/removing coupon:', error);
    res.status(500).send('Server Error');
  }
};

  module.exports={
    loadCart,addCart,deleteCart,updateQuantity,applyCoupon,
  }