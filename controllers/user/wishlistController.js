const express = require("express");
const router = express.Router();
const User = require("../../models/userSchema");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Wishlist = require('../../models/wishlistSchema')

// const loadWishlist = async (req, res) => {
//     try {
//       return res.render("wishlist");
//     } catch (error) {
//       console.log("wishlist page not loading", error);
//       res.status(500).send("Server error");
//     }
//   };


const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user; 
    if(!userId){
      return res.redirect('/signin')
    }
    const wishlist = await Wishlist.findOne({ userId }).populate('products.productId'); // Fetch products

    if (!wishlist || wishlist.products.length === 0) {
      return res.render("wishlist", { products: [] }); // Render an empty wishlist if no products exist
    }

    const products = wishlist.products.map(item => item.productId); // Extract product details
    return res.render("wishlist", { products }); // Pass products to the template
  } catch (error) {
    console.log("Wishlist page not loading", error);
    res.status(500).send("Server error");
  }
};


// Add product to wishlist route
// const addToWishlist =  async (req, res) => {
//   const {  productId } = req.body;

//   try {
//     const userId = req.session.user;
//     // Find the user's wishlist
//     let wishlist = await Wishlist.findOne({ userId });

//     if (!wishlist) {
//       // Create a new wishlist if one doesn't exist
//       wishlist = new Wishlist({ userId, products: [] });
//     }

//     // Check if the product is already in the wishlist
//     const productExists = wishlist.products.some(
//       (product) => product.productId.toString() === productId
//     );

//     if (productExists) {
//       return res.status(400).json({ message: 'Product already in wishlist' });
//     }

//     // Add the product to the wishlist
//     wishlist.products.push({ productId });
//     await wishlist.save();

//     res.status(200).json({ message: 'Product added to wishlist', wishlist });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };
const addRemoveWishlist = async (req, res) => {
  const { productId } = req.body;

  try {
      const userId = req.session.user;
      let wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
          wishlist = new Wishlist({ userId, products: [] });
      }

      // Check if the product is in the wishlist
      const productIndex = wishlist.products.findIndex(
          (product) => product.productId.toString() === productId
      );

      let isInWishlist = false;

      if (productIndex > -1) {
          // Remove product if it's already in the wishlist
          wishlist.products.splice(productIndex, 1);
      } else {
          // Add product if it's not in the wishlist
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

      // Remove the product from the wishlist
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