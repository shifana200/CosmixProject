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
        const { category, price ,newArrival  , sort , page =1} = req.query; // Extract category & price from query params
        const limit = 12; // 12 products per page
        const skip = (page - 1) * limit;

        let categoryFilter = {}; // Category filter
        let priceFilter = {}; // Price filter
        let sortOption = {}; // Sorting option
         // Default limit for regular pagination
        let skipOption = 0;

        console.log("==== SHOP PAGE FILTER LOG ====");
        console.log("Category Query:", category);
        console.log("Price Query:", price);

        // 1️⃣ Handle Category Filter (Case-Insensitive)
        if (category) {
            const categoryDoc = await Category.findOne({ 
                name: { $regex: new RegExp("^" + category + "$", "i") } 
            });

            if (categoryDoc) {
                categoryFilter.category = categoryDoc._id;
                console.log("Category Found:", categoryDoc.name, "-> ID:", categoryDoc._id);
            } else {
                console.log("Category Not Found!");
                return res.status(404).json({ message: "Category not found" });
            }
        }

        // 2️⃣ Handle Price Filter (Sorting & Ranges)
        if (price) {
            switch (price.toLowerCase()) {
                case "low-to-high":
                    sortOption = { salePrice: 1 }; // Sort by price (ascending)
                    break;
                case "high-to-low":
                    sortOption = { salePrice: -1 }; // Sort by price (descending)
                    break;
                case "under-500":
                    priceFilter.salePrice = { $lt: 500 };
                    break;
                case "500-1000":
                    priceFilter.salePrice = { $gte: 500, $lte: 1000 };
                    break;
                case "1000-2000":
                    priceFilter.salePrice = { $gte: 1000, $lte: 2000 };
                    break;
                case "above-2000":
                    priceFilter.salePrice = { $gt: 2000 };
                    break;
                default:
                    console.log("Invalid price filter!");
                    break;
            }
        }


        if (newArrival) {
          sortOption = { createdAt: -1 }; // Sort by createdAt field (most recent first)
           // Limit to only 9 products
      }


      if (sort) {
        switch (sort.toLowerCase()) {
          case "name-asc":
            sortOption.productName = 1; // A-Z order
            break;
          case "name-desc":
            sortOption.productName = -1; // Z-A order
            break;
          default:
            console.log("Invalid sort filter!");
            break;
        }
      }

        console.log("Final Category Filter:", categoryFilter);
        console.log("Final Price Filter:", priceFilter);
        console.log("Sort Option:", sortOption);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            ...categoryFilter,
            ...priceFilter,
        });

        // 3️⃣ Fetch Products with Filters
        const products = await Product.find({
            isBlocked: false,
            ...categoryFilter,  // Apply category filter
            ...priceFilter      // Apply price filter
        }).collation({ locale: 'en', strength: 1 }).sort(sortOption).skip(skip) 
        .limit(limit); // Apply sorting

        console.log("Products Found:", products.length);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shopPage', { products , currentPage: parseInt(page),
            totalPages,});
    } catch (error) {
        console.error("Error in loadShopPage:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


const searchProducts= async (req, res) => {
    try {
        const searchTerm = req.query.query;
         const limit = 12; // 12 products per page
        const skip = (page - 1) * limit;  // Get the search term from query parameter
        if (!searchTerm) {
            return res.redirect('/shop');  // If no search term, redirect to the shop page
        }

        // Perform search in the product database
        const results = await Product.find({
        
                 productName: { $regex: searchTerm, $options: 'i' }   // Case-insensitive search in product name
            
        });

        // Render the shop page with search results
        res.render('shopPage', { products: results, searchTerm });  // Pass results and search term to shop page
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Search error" });
    }
}



 
  
  module.exports={
    loadShopPage,searchProducts,
    
  
  }