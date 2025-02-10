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
            return res.render('userwallet', { walletAmount: 0, transactions: [] ,user});
        }

        res.render('userwallet', {
            walletAmount: wallet.walletAmount,
            transactions: wallet.transactions,user
        });

    } catch (error) {
        console.log("Error loading user wallet:", error);
        res.status(500).send('Server error');
    }
};



module.exports ={
    loadUserWallet
}