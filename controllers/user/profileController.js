const express = require('express');
const router = express.Router();
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema') 
const Address = require('../../models/addressSchema')
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');





const loadUserDashboard =  async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        //const addressData = await Address.findOne({userId: userId});

        return res.render('userdashboard',{user:userData,})
    } catch (error) {
        console.log("user dashboard page not loading", error)
        res.redirect('/pageNotFound')
    }
}

const loadUserOrder =  async (req, res) => {
    try {
        const userId = req.session.user;
        const orderDetails = await Order.find({userId}).populate('orderedItems.product')
        console.log("---------------------")
        console.log(orderDetails)
        return res.render('userorders',{orderDetails})
    } catch (error) {
        console.log("user orders page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadOrderDetails = async(req,res) => {
    try {
        const orderId = req.params.id;
        console.log('**************************')
        console.log(orderId)

        const orderDetails = await Order.findById(orderId).populate('orderedItems.product')
        const addressDetails = await Address.findOne({ _id: orderDetails.address });


        console.log(orderDetails)
        console.log('**************************')

        res.render('orderDetails',{orderDetails , addressDetails})
    } catch (error) {
        console.error("Error opening order details")
       return  res.redirect('/pageNotFound')
        
    }

}

const loadUpdateProfile =  async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        return res.render('userprofile',{user:userData})
    } catch (error) {
        console.log("user profile page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUserWallet =  async (req, res) => {
    try {
        return res.render('userwallet')
    } catch (error) {
        console.log("user profile page not loading", error)
        res.status(500).send('Server error')
    }
}


const loadWalletAddmoney =  async (req, res) => {
    try {
        return res.render('walletaddmoney')
    } catch (error) {
        console.log("wallet add money page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadWalletTransactions =  async (req, res) => {
    try {
        return res.render('wallettransactionhistory')
    } catch (error) {
        console.log("wallet add money page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUserAddress =  async (req, res) => {
    try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({userId: userId})
        
        return res.render('useraddress',{user:userData,userAddress:addressData})
    } catch (error) {
        console.log("my address page not loading", error)
        res.status(500).send('Server error')
    }
}

const loadUpdateUserAdress =  async (req, res) => {
    try {
        return res.render('myaddressupdate')
    } catch (error) {
        console.log("address update page not loading", error)
        res.status(500).send('Server error')
    }
}



const addNewAddress = async(req,res) =>{
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {name,addressType,city,landMark,district,state,pincode,phone,altPhone} = req.body;
        console.log(req.body);

        const userAddress = await Address.findOne({userId :userData._id});
        if(!userAddress){
            const newAddress = new Address({
                userId :userData._id,
                address:[{name,addressType,city,landMark,district,state,pincode,phone,altPhone,isDefault:true}]
            })
                await newAddress.save();

           
        }else{
            userAddress.address.push({name,addressType,city,landMark,district,state,pincode,phone,altPhone,isDefault:false})
            await userAddress.save();
        }
        res.redirect('/myaddress')
        
    } catch (error) {
        console.error('Error adding address :',error)
        res.redirect('/pageNotFound')
        
    }
}

const loadEditAddress = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userAddress = await Address.find({userId:userId})
        console.log("user address")
        console.log(userId)
        console.log(userAddress)
        console.log("------------------------------------------")
         return res.render('useraddress',{userAddress:userAddress})
         
    } catch (error) {
        console.error("error occred",error)
    }
}

const editAddress =async (req,res)=>{
    try {
        const data = req.body;
        const addressId =  req.params.id;
        const userId = req.session.user._id;
        // const addressId = req.query.id;
        const user = req.session.user;

        console.log(data)
        console.log(addressId)
        const findAddress = await Address.findOne({"address._id":addressId})
        if(!findAddress){
            //res.redirect('/pageNotFound')
        }
        const result = await Address.updateOne(
            {"address._id":addressId},
        {$set:{
            "address.$":{
                _id:addressId,
                addressType:data.addressType,
                name:data.name,
                city:data.city,
                landMark:data.landMark,
                district:data.district,
                state:data.state,
                pincode:data.pincode,
                phone:data.phone,
                altPhone:data.altPhone,
            }

        }}
    )
    
    res.redirect('/myaddress')
        
    } catch (error) {
        console.error("Error in edit Address",error)
        return res.redirect('/pageNotFound')
    }
}

const deleteAddress = async (req,res)=>{
   try {
    const addressId = req.query.id;
    
   const deletedAddress = await  Address.updateOne({"address._id":addressId},
    {$pull:{address:{_id:addressId}}})
    
    res.redirect('/myaddress')

   } catch (error) {
    console.error("error occured",error)
    res.redirect('/pageNotFound')
   }
}

const updateProfile = async (req, res) => {
    const { name, phone } = req.body;

    try {
        // Log the data coming in
        console.log("Received data:", req.body);

        // Update the user in the database
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user._id,
            { name, phone },
            { new: true, runValidators: true }
        );

        // Check if the update was successful
        if (!updatedUser) {
            return res.status(400).json({ success: false, message: 'Profile not updated' });
        }

        // Send the updated user data as JSON
        res.status(200).json({ success: true, user: updatedUser });

    } catch (err) {
        console.error("Error during profile update:", err);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
};

// POST route to handle order cancellation
const cancelOrder= async (req, res) => {
    try {
     

       

        const { cancellationReason} = req.body;
        const orderId = req.query.id;

        const orderDetails = await Order.findById(orderId).populate('orderedItems.product')
        const addressDetails = await Address.findOne({ _id: orderDetails.address });

        console.log("---------------")
        console.log(cancellationReason)
        console.log(orderId)

        // Check if orderId and cancellationReason are provided
        if (!cancellationReason || !orderId) {
            return res.render('orderDetails',{ success: false, message: 'Order ID and cancellation reason are required',orderDetails,addressDetails });
        }

        // Find the order by ID
        const order = await Order.findById(orderId);
        if (!order) {
            return res.render('orderDetails',{ success: false, message: 'Order not found' ,orderDetails,addressDetails});
        }

        // If the order is already cancelled, return an error
        if (order.status === 'Cancelled') {
            return res.render('orderDetails',{ success: false, message: 'Order is already cancelled',orderDetails,addressDetails });
        }

        if (order.status === 'Ordered') {
            for (let item of order.orderedItems) {
              const product = await Product.findById(item.product)
              if (product) {
                product.quantity += item.quantity;  // Restore product quantity when order is cancelled
                await product.save();  // Save the updated product quantity
              }
            }
          }

        // Update the order status to 'Cancelled' and store the cancellation reason
        const updatedOrder = await Order.updateOne(
            { _id: orderId },
            {
              $set: {
                status: 'Cancelled',
                CancellationReason: cancellationReason
              }
            }
          );

        // Save the updated order
        await order.save();

        // Send a success response
        res.render('orderDetails',{ success: true, message: 'Order cancelled successfully',orderDetails,addressDetails });
    } catch (error) {
        console.error(error);
        res.render('signIn',{ success: false, message: 'Server error' });
    }
}













  


module.exports = {
    loadUserDashboard,loadUpdateUserAdress,
    loadUserAddress,loadWalletTransactions,loadWalletAddmoney,
    loadUserWallet,loadUpdateProfile,loadUserOrder,
    addNewAddress,editAddress,loadEditAddress,updateProfile,deleteAddress,loadOrderDetails,cancelOrder,
    
    
}




