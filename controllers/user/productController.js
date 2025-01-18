const express = require("express");
const router = express.Router();

const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const sendOTP = require("../../utils/mailSender");
const hashPassword = require("../../utils/hashPassword");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')

const loadShopPage = async (req, res) => {
    try {
      
      const Categories = await Category.find({isListed:true})
  
      
    
      
  
      const products = await Product.find({isBlocked:false})
      

      


      res.render('shopPage',{products:products})
    } catch (error) {
      res.redirect("/pageNotFound");
    }
  };


  
  

  const filterProducts = async (req, res) => {
    try {
      
      const categoryNames = req.query.categories ? req.query.categories.split(',') : []; 
    
  
      
      const categories = categoryNames.length > 0 ? await Category.find({
        name: { $in: categoryNames.map(name => new RegExp(`^${name}$`, 'i')) } 
      }) : [];
      const categoryIds = categories.map(category => category._id.toString()); 
  
      
      const priceRanges = req.query.priceRanges ? req.query.priceRanges.split(',') : []; 
      const priceFilters = priceRanges.map(range => {
        const [minPrice, maxPrice] = range.split('-').map(price => parseFloat(price));
        return { minPrice, maxPrice };
      });
  
      
      const allProducts = await Product.find();
      console.log("---------", allProducts);
  
      if (!Array.isArray(allProducts)) {
        throw new Error('Product data is not an array');
      }
  
    
      const filteredProducts = allProducts.filter(product => {
        const isInCategory = categoryIds.length === 0 || categoryIds.includes(product.category.toString());
        const isInPriceRange = priceFilters.length === 0 || priceFilters.some(range => 
          product.regularPrice >= range.minPrice && product.regularPrice <= range.maxPrice
        );
        return isInCategory && isInPriceRange;
      });
      console.log("===============");
      console.log(filteredProducts);
  
      
      const { priceSort, productSort } = req.query;
  
      
      if (priceSort === 'low-to-high') {
        filteredProducts.sort((a, b) => a.regularPrice - b.regularPrice);
      } else if (priceSort === 'high-to-low') {
        filteredProducts.sort((a, b) => b.regularPrice - a.regularPrice);
      }
  
      if (productSort === 'a-to-z') {
        filteredProducts.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      } else if (productSort === 'z-to-a') {
        filteredProducts.sort((a, b) => a.name > b.name ? -1 : a.name < b.name ? 1 : 0);
      }
      
  
      res.render('shopPage', { products: filteredProducts });
  
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  
  
  
  



  module.exports={
    loadShopPage,
    filterProducts,
  
  }