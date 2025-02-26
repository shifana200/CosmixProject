const express = require('express');
const router = express.Router();
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema') 
const Address = require('../../models/addressSchema')
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema')



const loadUserWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findOne({ _id: userId });


        if (!user) {
            return res.status(404).send("User not found");
        }
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            // If wallet doesn't exist, send default values
            return res.render('userwallet', { walletAmount: 0, transactions: [] ,user, currentPage: 1, totalPages: 1});
        }

        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = 5; // Transactions per page
        const skip = (page - 1) * limit; 


        const sortedTransactions = wallet.transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const totalTransactions = sortedTransactions.length; // Total transactions count
        const totalPages = Math.ceil(totalTransactions / limit); // Calculate total pages


        // Paginate the transactions array (as MongoDB isn't handling it directly)
        const paginatedTransactions = sortedTransactions.slice(skip, skip + limit);

        res.render('userwallet', {
            walletAmount: wallet.walletAmount,
            transactions: paginatedTransactions,
            user, currentPage: page,
            totalPages
        });

    } catch (error) {
        console.log("Error loading user wallet:", error);
        res.status(500).send('Server error');
    }
};



module.exports ={
    loadUserWallet
}