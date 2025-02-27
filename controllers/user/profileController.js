const express = require('express');
const router = express.Router();
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema') 
const Address = require('../../models/addressSchema')
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema')
const PDFDocument = require("pdfkit");
const fs = require("fs");
const createTable = require("pdfkit-table");





const loadUserDashboard =  async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        return res.render('userdashboard',{user:userData,})
    } catch (error) {
        console.log("user dashboard page not loading", error)
        res.redirect('/pageNotFound')
    }
}

const loadUserOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1; 
        const limit = 2; 
        const skip = (page - 1) * limit;

        
        const orderDetails = await Order.find({ userId })
            .populate('orderedItems.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        
        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        
        return res.render('userorders', { orderDetails, totalPages, currentPage: page });
    } catch (error) {
        console.log("user orders page not loading", error);
        res.status(500).send('Server error');
    }
};


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
            
            return res.redirect('/checkout');  
        } else {
            
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
        const user = req.session.user;

        console.log(data)
        console.log(addressId)
        const findAddress = await Address.findOne({"address._id":addressId})
        if(!findAddress){
            
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
        
        console.log("Received data:", req.body);

        
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user._id,
            { name, phone },
            { new: true, runValidators: true }
        );

        
        if (!updatedUser) {
            return res.status(400).json({ success: false, message: 'Profile not updated' });
        }

        
        res.status(200).json({ success: true, user: updatedUser });

    } catch (err) {
        console.error("Error during profile update:", err);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
};

const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log('**************************');
        console.log(" Order ID:", orderId);

        
        const orderDetails = await Order.findById(orderId)
        .populate('orderedItems.product')
        .populate('userId', 'name');

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

        
        const addressDocument = await Address.findOne(
            { "address._id": orderDetails.addressId }, 
            { "address.$": 1 } 
        );

        if (!addressDocument || !addressDocument.address.length) {
            console.log(" Address document not found for ID:", orderDetails.addressId);
            return res.redirect('/pageNotFound');
        }

        const addressDetails = addressDocument.address[0];

        console.log('Order Details:', orderDetails);
        console.log(' Address Details:', addressDetails);
        console.log('**************************');

        res.render('orderDetails', { orderDetails, addressDetails , userName: orderDetails.userId?.name });

    } catch (error) {
        console.error(" Error loading order details:", error);
        return res.redirect('/pageNotFound');
    }
};

const generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        
        const order = await Order.findById(orderId)
            .populate("orderedItems.product")
            .populate("userId");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderId}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        
        doc.fontSize(22).text("Cosmix", { align: "center", underline: true }).moveDown(1.5);

    
        doc.fontSize(12);
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Customer Name: ${order.userId.name || "N/A"}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.moveDown(1.5);

        
        let startY = doc.y;
        const columnX = { product: 50, price: 250, quantity: 350, total: 450 };

        doc.font("Helvetica-Bold");
        doc.text("Product Name", columnX.product, startY);
        doc.text("Price", columnX.price, startY);
        doc.text("Quantity", columnX.quantity, startY);
        doc.text("Total Price", columnX.total, startY);

        doc.moveDown(1);

        
        let subtotal = 0;
        startY = doc.y;

        order.orderedItems.forEach((item, index) => {
            const productName = item.product.productName;
            const price = `Rs ${item.price.toFixed(2)}`;
            const quantity = item.quantity.toString();
            const totalItemPrice = `Rs ${(item.quantity * item.price).toFixed(2)}`;

            
            const productNameHeight = doc.heightOfString(productName, { width: 180 });
            const rowHeight = Math.max(20, productNameHeight + 5); 

            
            if (startY + rowHeight > doc.page.height - 50) {
                doc.addPage();
                startY = 50; 
            }

            
            doc.font("Helvetica").text(productName, columnX.product, startY, { width: 180 });
            doc.text(price, columnX.price, startY);
            doc.text(quantity, columnX.quantity, startY);
            doc.text(totalItemPrice, columnX.total, startY);

            startY += rowHeight; 
        });

        doc.moveDown(2);


        const gstAmount = subtotal * 0.3;
        

        doc
            .font("Helvetica-Bold")
            .text(`Subtotal: Rs ${order.totalPrice.toFixed(2)}`, 400, doc.y)
            .text(`Discount: Rs ${order.discount.toFixed(2)}`, 400, doc.y + 15)
            .text(`GST: Rs ${gstAmount.toFixed(2)}`, 400, doc.y + 15)
            .text(`Payable Amount: Rs ${order.PayableAmount.toFixed(2)}`, 400, doc.y + 15);

        doc.end();
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).send("Failed to generate invoice");
    }
};

const returnOrder = async (req, res) => {
    try {
        const { returnReason } = req.body;
        const orderId = req.query.id;

        console.log("Return Order Request - Order ID:", orderId);

        const orderDetails = await Order.findById(orderId).populate('orderedItems.product').populate('userId', 'name');

        if (!orderDetails) {
            return res.render('orderDetails', { success: false, message: 'Order not found' });
        }
        if (!orderDetails.addressId) {
            console.log(" Order does not contain an address ID");
            return res.redirect('/pageNotFound');
        }
        const addressDocument = await Address.findOne(
            { "address._id": orderDetails.addressId }, 
            { "address.$": 1 } 
        );

        if (!addressDocument || !addressDocument.address.length) {
            console.log(" Address document not found for ID:", orderDetails.addressId);
            return res.redirect('/pageNotFound');
        }

        const addressDetails = addressDocument.address[0];

        const orderCreatedAt = new Date(orderDetails.createdAt);
        const returnDeadline = new Date(orderCreatedAt);
        returnDeadline.setDate(returnDeadline.getDate() + 7); 
        const isReturnExpired = new Date() > returnDeadline;


        if (orderDetails.status === 'Cancelled' || orderDetails.status === 'Returned') {
            return res.render('orderDetails', {
                success: false,
                message: `Order is already ${orderDetails.status.toLowerCase()}.`,
                orderDetails,
                isReturnExpired,

            });
        }

        if (isReturnExpired) {
            return res.render('orderDetails', {
                success: false,
                message: 'Return period expired',
                orderDetails,
                isReturnExpired
            });
        }

        
        orderDetails.status = 'Return Pending';
        orderDetails.returnReason = returnReason;
        await orderDetails.save();

        res.render('orderDetails', {
            success: true,
            message: 'Return request sent for approval',
            orderDetails,addressDetails,userName: orderDetails.userId?.name,
            isReturnExpired,
        });

    } catch (error) {
        console.error("Error requesting return:", error);
        res.render('orderDetails', { success: false, message: 'Server error' });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { cancellationReason } = req.body;
        const orderId = req.query.id;

        console.log("Cancel Order Request - Order ID:", orderId);

        const orderDetails = await Order.findById(orderId).populate('orderedItems.product').populate('userId', 'name');

        if (!orderDetails) {
            return res.render('orderDetails', { success: false, message: 'Order not found' });
        }
        if (!orderDetails.addressId) {
            console.log(" Order does not contain an address ID");
            return res.redirect('/pageNotFound');
        }
        const addressDocument = await Address.findOne(
            { "address._id": orderDetails.addressId }, 
            { "address.$": 1 } // Fetch only the matched address
        );

        if (!addressDocument || !addressDocument.address.length) {
            console.log(" Address document not found for ID:", orderDetails.addressId);
            return res.redirect('/pageNotFound');
        }

        const addressDetails = addressDocument.address[0];


        if (orderDetails.status === 'Cancelled' || orderDetails.status === 'Returned') {
            return res.render('orderDetails', {
                success: false,
                message: `Order is already ${orderDetails.status.toLowerCase()}.`,
                orderDetails,userName: orderDetails.userId?.name
            });
        }

        
        orderDetails.status = 'Cancellation Pending';
        orderDetails.cancellationReason = cancellationReason;
        await orderDetails.save();

        res.render('orderDetails', {
            success: true,
            message: 'Cancellation request sent for approval',
            orderDetails,addressDetails
        });

    } catch (error) {
        console.error("Error requesting cancellation:", error);
        res.render('orderDetails', { success: false, message: 'Server error' });
    }
};

const approveOrderRequest = async (req, res) => {
    try {
        const { orderId, approvalStatus } = req.body;

        const orderDetails = await Order.findById(orderId);

        if (!orderDetails) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (approvalStatus === 'approve') {
            if (orderDetails.status === 'Cancellation Pending') {
                orderDetails.status = 'Cancelled';

                
                for (let item of orderDetails.orderedItems) {
                    const product = await Product.findById(item.product);
                    if (product) {
                        product.quantity += item.quantity;
                        await product.save();
                    }
                }

                
                if (orderDetails.paymentMethod === 'Online Payment') {
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
                    } else {
                        userWallet = await Wallet.create({
                            userId: orderDetails.userId,
                            walletAmount: orderDetails.PayableAmount,
                            transactions: [refundTransaction]
                        });
                    }
                }
            } else if (orderDetails.status === 'Return Pending') {
                orderDetails.status = 'Returned';

                
                if (orderDetails.paymentMethod === 'Online Payment') {
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
                    } else {
                        userWallet = await Wallet.create({
                            userId: orderDetails.userId,
                            walletAmount: orderDetails.PayableAmount,
                            transactions: [refundTransaction]
                        });
                    }
                }
            }
        } else {
            if (orderDetails.status === 'Cancellation Pending') {
                orderDetails.status = 'Ordered';
            } else if (orderDetails.status === 'Return Pending') {
                orderDetails.status = 'Delivered';
            }
        }

        await orderDetails.save();

        res.json({ success: true, message: `Order ${orderDetails.status} successfully` });

    } catch (error) {
        console.error("Error approving request:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};








module.exports = {
    loadUserDashboard,loadUpdateUserAdress,
    loadUserAddress,loadWalletTransactions,loadWalletAddmoney,
    loadUpdateProfile,loadUserOrder,
    addNewAddress,editAddress,loadEditAddress,updateProfile,deleteAddress,
    loadOrderDetails,cancelOrder,returnOrder,generateInvoice,
    
    
}




