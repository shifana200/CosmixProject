const express = require('express');
const router = express.Router();
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema') 
const Address = require('../../models/addressSchema')
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema')




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
        const orderDetails = await Order.find({userId}).populate('orderedItems.product').sort({createdAt: -1});
        console.log("---------------------")
        console.log(orderDetails)
        return res.render('userorders',{orderDetails})
    } catch (error) {
        console.log("user orders page not loading", error)
        res.status(500).send('Server error')
    }
}

// const loadOrderDetails = async(req,res) => {
//     try {
//         const orderId = req.params.id;
//         console.log('**************************')
//         console.log(orderId)

//         const orderDetails = await Order.findById(orderId)
//         .populate('orderedItems.product')
//         .populate('addressId');         


//         console.log(orderDetails)
//         console.log('**************************')

//         res.render('orderDetails',{orderDetails , userAddress: orderDetails.addressId})
//     } catch (error) {
//         console.error("Error opening order details")
//        return  res.redirect('/pageNotFound')
        
//     }

// }

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

        if(!userData){
            return res.redirect('/signin')
        }
        const {name,addressType,city,landMark,district,state,pincode,phone,altPhone,source} = req.body;
        console.log(req.body);

        const userAddress = await Address.findOne({userId :userData._id});
        if(!userAddress){
            const newAddress = new Address({
                userId :userData._id,
                address:[{name,addressType,city,landMark,district,state,pincode,phone,altPhone,isDefault:true}]
            })
                await newAddress.save();

           
        }else{

            userAddress.address.forEach(address => {
                address.isDefault = false;
            });
            
            userAddress.address.push({name,addressType,city,landMark,district,state,pincode,phone,altPhone,isDefault:true})
            await userAddress.save();
        }

        if (source === 'checkout') {
            // Redirect to checkout page or another page
            return res.redirect('/checkout');  // For example
        } else {
            // Redirect to address page or show success message
            return res.redirect('/myaddress');
        }
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

// const returnOrder = async (req, res) => {
//     try {
//         const { returnReason } = req.body;
//         const orderId = req.query.id;

//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.render('orderDetails', { success: false, message: 'Order not found' });
//         }

//         if (order.status === 'Cancelled' || order.status === 'Returned') {
//             return res.render('orderDetails', { success: false, message: `Order is already ${order.status.toLowerCase()}.` });
//         }

//         // Update order to returned
//         order.status = 'Returned';
//         order.returnReason = returnReason;
//         await order.save();

//         res.render('orderDetails', { success: true, message: 'Return request initiated successfully', orderDetails: order });
//     } catch (error) {
//         console.error(error);
//         res.render('orderDetails', { success: false, message: 'Server error' });
//     }
// };


const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log('**************************');
        console.log(" Order ID:", orderId);

        // Find the order and populate product details
        const orderDetails = await Order.findById(orderId).populate('orderedItems.product');

        if (!orderDetails) {
            console.log(" Order not found");
            return res.redirect('/pageNotFound');
        }

        console.log(" Found Order Details:", orderDetails);
        console.log(" Order Address ID:", orderDetails.addressId);

        if (!orderDetails.addressId) {
            console.log(" Order does not contain an address ID");
            return res.redirect('/pageNotFound');
        }

        // Fetch the address document where the address ID is inside the array
        const addressDocument = await Address.findOne(
            { "address._id": orderDetails.addressId }, 
            { "address.$": 1 } // Fetch only the matched address
        );

        if (!addressDocument || !addressDocument.address.length) {
            console.log(" Address document not found for ID:", orderDetails.addressId);
            return res.redirect('/pageNotFound');
        }

        const addressDetails = addressDocument.address[0];

        console.log('✅ Order Details:', orderDetails);
        console.log('✅ Address Details:', addressDetails);
        console.log('**************************');

        res.render('orderDetails', { orderDetails, addressDetails });

    } catch (error) {
        console.error(" Error loading order details:", error);
        return res.redirect('/pageNotFound');
    }
};

// const returnOrder = async (req, res) => {
//     try {
//         const { returnReason } = req.body;
//         const orderId = req.query.id;

//         console.log('**************************');
//         console.log("Return Order - Order ID:", orderId);

//         const orderDetails = await Order.findById(orderId).populate('orderedItems.product');

//         if (!orderDetails) {
//             console.log("Order not found");
//             return res.render('orderDetails', { success: false, message: 'Order not found' });
//         }

//         console.log("Found Order Details:", orderDetails);
//         console.log("Order Address ID:", orderDetails.addressId);

//         if (!orderDetails.addressId) {
//             console.log("Order does not contain an address ID");
//             return res.render('orderDetails', { success: false, message: 'Order address not found' });
//         }

//         // Fetch the address document
//         const addressDocument = await Address.findOne(
//             { "address._id": orderDetails.addressId },
//             { "address.$": 1 }
//         );

//         if (!addressDocument || !addressDocument.address.length) {
//             console.log("Address document not found for ID:", orderDetails.addressId);
//             return res.render('orderDetails', { success: false, message: 'Shipping address not found' });
//         }

//         const addressDetails = addressDocument.address[0];

//         console.log('✅ Address Details:', addressDetails);

//         // Check if the order is already cancelled or returned
//         if (orderDetails.status === 'Cancelled' || orderDetails.status === 'Returned') {
//             return res.render('orderDetails', {
//                 success: false,
//                 message: `Order is already ${orderDetails.status.toLowerCase()}.`,
//                 orderDetails,
//                 addressDetails
//             });
//         }

//         // Update order status without modifying stock
//         orderDetails.status = 'Returned';
//         orderDetails.returnReason = returnReason;
//         await orderDetails.save();

//         console.log('✅ Return initiated successfully');

//         // Wallet Refund Logic
//         if (orderDetails.status === 'Delivered' || orderDetails.paymentMethod === 'Online Payment') {
//             const user = await User.findById(orderDetails.userId);
//             if (user) {
//                 user.wallet += orderDetails.payableAmount;
//                 await user.save();
//                 console.log(`💰 Wallet updated! New Balance: ${user.wallet}`);
//             }
//         }

//         res.render('orderDetails', {
//             success: true,
//             message: 'Return initiated successfully',
//             orderDetails,
//             addressDetails
//         });

//     } catch (error) {
//         console.error("Error returning order:", error);
//         res.render('orderDetails', { success: false, message: 'Server error' });
//     }
// };

// const cancelOrder = async (req, res) => {
//     try {
//         const { cancellationReason } = req.body;
//         const orderId = req.query.id;

//         console.log('**************************');
//         console.log("Cancel Order - Order ID:", orderId);

//         const orderDetails = await Order.findById(orderId).populate('orderedItems.product');

//         if (!orderDetails) {
//             console.log("Order not found");
//             return res.render('orderDetails', { success: false, message: 'Order not found' });
//         }

//         console.log("Found Order Details:", orderDetails);
//         console.log("Order Address ID:", orderDetails.addressId);

//         if (!orderDetails.addressId) {
//             console.log("Order does not contain an address ID");
//             return res.render('orderDetails', { success: false, message: 'Order address not found' });
//         }

//         // Fetch the address document
//         const addressDocument = await Address.findOne(
//             { "address._id": orderDetails.addressId },
//             { "address.$": 1 }
//         );

//         if (!addressDocument || !addressDocument.address.length) {
//             console.log("Address document not found for ID:", orderDetails.addressId);
//             return res.render('orderDetails', { success: false, message: 'Shipping address not found' });
//         }

//         const addressDetails = addressDocument.address[0];

//         console.log('✅ Address Details:', addressDetails);

//         // Check if the order is already cancelled or returned
//         if (orderDetails.status === 'Cancelled' || orderDetails.status === 'Returned') {
//             return res.render('orderDetails', {
//                 success: false,
//                 message: `Order is already ${orderDetails.status.toLowerCase()}.`,
//                 orderDetails,
//                 addressDetails
//             });
//         }

//         // Restore stock if necessary
//         if (orderDetails.status === 'Ordered') {
//             for (let item of orderDetails.orderedItems) {
//                 const product = await Product.findById(item.product);
//                 if (product) {
//                     product.quantity += item.quantity;
//                     await product.save();
//                 }
//             }
//         }

//         // Update order status
//         orderDetails.status = 'Cancelled';
//         orderDetails.cancellationReason = cancellationReason;
//         await orderDetails.save();

//         console.log('✅ Order cancelled successfully');

//         // Wallet Refund Logic
//         if (orderDetails.status === 'Delivered' || orderDetails.paymentMethod === 'Online Payment') {
//             const user = await User.findById(orderDetails.userId);
//             if (user) {
//                 user.wallet += orderDetails.payableAmount;
//                 await user.save();
//                 console.log(`💰 Wallet updated! New Balance: ${user.wallet}`);
//             }
//         }

//         res.render('orderDetails', {
//             success: true,
//             message: 'Order cancelled successfully',
//             orderDetails,
//             addressDetails
//         });

//     } catch (error) {
//         console.error("Error cancelling order:", error);
//         res.render('orderDetails', { success: false, message: 'Server error' });
//     }
// };

const returnOrder = async (req, res) => {
    try {
        const { returnReason } = req.body;
        const orderId = req.query.id;

        console.log('**************************');
        console.log("Return Order - Order ID:", orderId);

        const orderDetails = await Order.findById(orderId).populate('orderedItems.product');

        if (!orderDetails) {
            console.log("Order not found");
            return res.render('orderDetails', { success: false, message: 'Order not found' });
        }

        console.log("Found Order Details:", orderDetails);

        if (!orderDetails.addressId) {
            console.log("Order does not contain an address ID");
            return res.render('orderDetails', { success: false, message: 'Order address not found' });
        }

        // Fetch the address document
        const addressDocument = await Address.findOne(
            { "address._id": orderDetails.addressId },
            { "address.$": 1 }
        );

        if (!addressDocument || !addressDocument.address.length) {
            console.log("Address document not found for ID:", orderDetails.addressId);
            return res.render('orderDetails', { success: false, message: 'Shipping address not found' });
        }

        const addressDetails = addressDocument.address[0];

        console.log('✅ Address Details:', addressDetails);

        // Check if the order is already cancelled or returned
        if (orderDetails.status === 'Cancelled' || orderDetails.status === 'Returned') {
            return res.render('orderDetails', {
                success: false,
                message: `Order is already ${orderDetails.status.toLowerCase()}.`,
                orderDetails,
                addressDetails
            });
        }

        // Update order status
        orderDetails.status = 'Returned';
        orderDetails.returnReason = returnReason;
        await orderDetails.save();

        console.log('✅ Return initiated successfully');

        // Wallet Refund Logic
        if (orderDetails.status === 'Delivered' || orderDetails.paymentMethod === 'Online Payment') {
            let userWallet = await Wallet.findOne({ userId: orderDetails.userId });

            const refundTransaction = {
                amount: orderDetails.PayableAmount,
                transactionType: 'Return',
                timestamp: new Date()
            };

            if (userWallet) {
                userWallet.walletAmount += orderDetails.PayableAmount;
                userWallet.transactions.push(refundTransaction);
                await userWallet.save();
                console.log(`💰 Wallet updated! New Balance: ${userWallet.walletAmount}`);
            } else {
                userWallet = await Wallet.create({
                    userId: orderDetails.userId,
                    walletAmount: orderDetails.PayableAmount,
                    transactions: [refundTransaction]
                });
                console.log(`💰 New wallet created! Balance: ${userWallet.walletAmount}`);
            }
        }

        res.render('orderDetails', {
            success: true,
            message: 'Return initiated successfully',
            orderDetails,
            addressDetails
        });

    } catch (error) {
        console.error("Error returning order:", error);
        res.render('orderDetails', { success: false, message: 'Server error' });
    }
};


const cancelOrder = async (req, res) => {
    try {
        const { cancellationReason } = req.body;
        const orderId = req.query.id;

        console.log('**************************');
        console.log("Cancel Order - Order ID:", orderId);

        const orderDetails = await Order.findById(orderId).populate('orderedItems.product');

        if (!orderDetails) {
            console.log("Order not found");
            return res.render('orderDetails', { success: false, message: 'Order not found' });
        }

        console.log("Found Order Details:", orderDetails);

        if (!orderDetails.addressId) {
            console.log("Order does not contain an address ID");
            return res.render('orderDetails', { success: false, message: 'Order address not found' });
        }

        // Fetch the address document
        const addressDocument = await Address.findOne(
            { "address._id": orderDetails.addressId },
            { "address.$": 1 }
        );

        if (!addressDocument || !addressDocument.address.length) {
            console.log("Address document not found for ID:", orderDetails.addressId);
            return res.render('orderDetails', { success: false, message: 'Shipping address not found' });
        }

        const addressDetails = addressDocument.address[0];

        console.log('✅ Address Details:', addressDetails);

        // Check if the order is already cancelled or returned
        if (orderDetails.status === 'Cancelled' || orderDetails.status === 'Returned') {
            return res.render('orderDetails', {
                success: false,
                message: `Order is already ${orderDetails.status.toLowerCase()}.`,
                orderDetails,
                addressDetails
            });
        }

        // Restore stock if necessary
        if (orderDetails.status === 'Ordered') {
            for (let item of orderDetails.orderedItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.quantity += item.quantity;
                    await product.save();
                }
            }
        }

        // Update order status
        orderDetails.status = 'Cancelled';
        orderDetails.cancellationReason = cancellationReason;
        await orderDetails.save();

        console.log('✅ Order cancelled successfully');

        // Wallet Refund Logic
        if (orderDetails.status === 'Delivered' || orderDetails.paymentMethod === 'Online Payment') {
            let userWallet = await Wallet.findOne({ userId: orderDetails.userId });

            const refundTransaction = {
                amount: orderDetails.PayableAmount,
                transactionType: 'Cancellation',
                timestamp: new Date()
            };

            if (userWallet) {
                userWallet.walletAmount += orderDetails.PayableAmount;
                userWallet.transactions.push(refundTransaction);
                await userWallet.save();
                console.log(`💰 Wallet updated! New Balance: ${userWallet.walletAmount}`);
            } else {
                userWallet = await Wallet.create({
                    userId: orderDetails.userId,
                    walletAmount: orderDetails.PayableAmount,
                    transactions: [refundTransaction]
                });
                console.log(`💰 New wallet created! Balance: ${userWallet.walletAmount}`);
            }
        }

        res.render('orderDetails', {
            success: true,
            message: 'Order cancelled successfully',
            orderDetails,
            addressDetails
        });

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.render('orderDetails', { success: false, message: 'Server error' });
    }
};














  


module.exports = {
    loadUserDashboard,loadUpdateUserAdress,
    loadUserAddress,loadWalletTransactions,loadWalletAddmoney,
    loadUpdateProfile,loadUserOrder,
    addNewAddress,editAddress,loadEditAddress,updateProfile,deleteAddress,loadOrderDetails,cancelOrder,returnOrder,
    
    
}




