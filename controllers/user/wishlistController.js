const express = require("express");
const router = express.Router();
const User = require("../../models/userSchema");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Wishlist = require('../../models/wishlistSchema')

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user; 
    if(!userId){
      return res.redirect('/signin')
    }
    const wishlist = await Wishlist.findOne({ userId }).populate('products.productId'); 

    if (!wishlist || wishlist.products.length === 0) {
      return res.render("wishlist", { products: [] }); 
    }

    const products = wishlist.products.map(item => item.productId); 
    return res.render("wishlist", { products }); 
  } catch (error) {
    console.log("Wishlist page not loading", error);
    res.status(500).send("Server error");
  }
};

const addRemoveWishlist = async (req, res) => {
  const { productId } = req.body;

  try {
      const userId = req.session.user;
      let wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
          wishlist = new Wishlist({ userId, products: [] });
      }

      const productIndex = wishlist.products.findIndex(
          (product) => product.productId.toString() === productId
      );

      let isInWishlist = false;

      if (productIndex > -1) {
      
          wishlist.products.splice(productIndex, 1);
      } else {
        
          wishlist.products.push({ productId });
          isInWishlist = true;
      }

      await wishlist.save();
      res.status(200).json({ 
          message: isInWishlist ? 'Product added to wishlist' : 'Product removed from wishlist', 
          isInWishlist 
      });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
};

const removeFromWishlist = async (req, res) => {
  const { productId } = req.body;

  try {
      const userId = req.session.user;
      let wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
          return res.status(400).json({ message: 'Wishlist not found' });
      }

      
      wishlist.products = wishlist.products.filter(
          (product) => product.productId.toString() !== productId
      );

      await wishlist.save();

      res.status(200).json({ message: 'Product removed from wishlist' });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
};


  module.exports ={
    loadWishlist,
    addRemoveWishlist,
    removeFromWishlist,
  }