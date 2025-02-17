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

  
  // const loadShopPage = async (req, res) => {
  //   try {
  //     const { category } = req.query;
  //     console.log("___________________________________________")
  //     console.log(category)
      
  //     const page = parseInt(req.query.page) || 1; 
  //     const limit = 12;
  //     const skip = (page - 1) * limit;
  
  //     const listedCategories = await Category.find({ isListed: true });
  
  //     if (listedCategories.length === 0) {
  //       console.log("No listed categories found. Rendering shop page with no products.");
  //       return res.render('shopPage', { products: [], currentPage: page, totalPages: 0 });
  //     }
  
      
  //     let categoryFilter = {};
  //     if (category) {
  //       const categoryDoc = await Category.findOne({ name: category });
  //       if (categoryDoc) {
  //         categoryFilter = { category: categoryDoc._id }; // Use category's _id
  //       }
  //     }

  //     console.log(categoryFilter)
  
  //     // Count total products for pagination
  //     const totalProducts = await Product.countDocuments({
  //       isBlocked: false,
  //       ...categoryFilter, // Apply category filter
  //       category: { $in: listedCategories.map(cat => cat._id) },
  //     });
  
  //     // Fetch filtered products with pagination
  //     const products = await Product.find({
  //       isBlocked: false,
  //       ...categoryFilter,
  //       category: { $in: listedCategories.map(cat => cat._id) },
  //     }).skip(skip).limit(limit);
  
  //     const totalPages = Math.ceil(totalProducts / limit); // Calculate total pages
  
  //     console.log("Filtered products:", products);
  
  //     // Pass currentPage to the template
  //     res.render('shopPage', { products, currentPage: page, totalPages, category });
  //   } catch (error) {
  //     console.error("Error loading shop page:", error.message);
  //     res.render('shopPage', { products: [], currentPage: 1, totalPages: 0 });
  //   }
  // };

  const loadShopPage = async (req, res) => {
    try {
        const { category, price ,newArrival  , sort} = req.query; // Extract category & price from query params
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

        // 3️⃣ Fetch Products with Filters
        const products = await Product.find({
            isBlocked: false,
            ...categoryFilter,  // Apply category filter
            ...priceFilter      // Apply price filter
        }).collation({ locale: 'en', strength: 1 }).sort(sortOption); // Apply sorting

        console.log("Products Found:", products.length);
        res.render('shopPage', { products });
    } catch (error) {
        console.error("Error in loadShopPage:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


const searchProducts= async (req, res) => {
    try {
        const searchTerm = req.query.query;  // Get the search term from query parameter
        if (!searchTerm) {
            return res.redirect('/shop');  // If no search term, redirect to the shop page
        }

        // Perform search in the product database
        const results = await Product.find({
            $or: [
                { productName: { $regex: searchTerm, $options: 'i' } },  // Case-insensitive search in product name
                { description: { $regex: searchTerm, $options: 'i' } },  // Case-insensitive search in description
            ]
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