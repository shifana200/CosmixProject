const express = require("express");
const router = express.Router();
const User = require("../../models/userSchema");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')



const loadCart = async (req, res) => {
    try {
  
      const userId = req.session.user;
  
      if(!userId){
        return res.redirect('/signin');
      }
  
  
  
  const cart = await Cart.findOne({userId}).populate('items.productId')
  console.log(cart)
  
  if (!cart || cart.items.length === 0) {
    return res.render('cart', { cart:{items:[]} });
  }
 
  
       res.render("cart",{cart})
    } catch (error) {
      console.log("cart page not loading", error);
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

  module.exports={
    loadCart,addCart,deleteCart,updateQuantity
  }