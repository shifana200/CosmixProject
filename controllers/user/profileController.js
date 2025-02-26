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
        //const addressData = await Address.findOne({userId: userId});

        return res.render('userdashboard',{user:userData,})
    } catch (error) {
        console.log("user dashboard page not loading", error)
        res.redirect('/pageNotFound')
    }
}

// const loadUserOrder =  async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const orderDetails = await Order.find({userId}).populate('orderedItems.product').sort({createdAt: -1});
//         console.log("---------------------")
//         console.log(orderDetails)
//         return res.render('userorders',{orderDetails})
//     } catch (error) {
//         console.log("user orders page not loading", error)
//         res.status(500).send('Server error')
//     }
// }

const loadUserOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1; // Get current page from query params
        const limit = 2; // Number of orders per page
        const skip = (page - 1) * limit;

        // Fetch orders with pagination
        const orderDetails = await Order.find({ userId })
            .populate('orderedItems.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total orders count
        const totalOrders = await Order.countDocuments({ userId });

        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / limit);

        // Render the page with pagination data
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

const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log('**************************');
        console.log(" Order ID:", orderId);

        // Find the order and populate product details
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

        res.render('orderDetails', { orderDetails, addressDetails , userName: orderDetails.userId?.name });

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

//         // Update order status
//         orderDetails.status = 'Return Pending';
//         orderDetails.returnReason = returnReason;
//         await orderDetails.save();

//         console.log('✅ Return initiated successfully');

//         // Wallet Refund Logic
//         if (orderDetails.status === 'Delivered' || orderDetails.paymentMethod === 'Online Payment') {
//             let userWallet = await Wallet.findOne({ userId: orderDetails.userId });

//             const refundTransaction = {
//                 amount: orderDetails.PayableAmount,
//                 transactionType: 'Return',
//                 timestamp: new Date()
//             };

//             if (userWallet) {
//                 userWallet.walletAmount += orderDetails.PayableAmount;
//                 userWallet.transactions.push(refundTransaction);
//                 await userWallet.save();
//                 console.log(`💰 Wallet updated! New Balance: ${userWallet.walletAmount}`);
//             } else {
//                 userWallet = await Wallet.create({
//                     userId: orderDetails.userId,
//                     walletAmount: orderDetails.PayableAmount,
//                     transactions: [refundTransaction]
//                 });
//                 console.log(`💰 New wallet created! Balance: ${userWallet.walletAmount}`);
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
//         orderDetails.status = 'Cancellation Pending';
//         orderDetails.cancellationReason = cancellationReason;
//         await orderDetails.save();

//         console.log('✅ Order cancelled successfully');

//         // Wallet Refund Logic
//         if (orderDetails.status === 'Delivered' || orderDetails.paymentMethod === 'Online Payment') {
//             let userWallet = await Wallet.findOne({ userId: orderDetails.userId });

//             const refundTransaction = {
//                 amount: orderDetails.PayableAmount,
//                 transactionType: 'Cancellation',
//                 timestamp: new Date()
//             };

//             if (userWallet) {
//                 userWallet.walletAmount += orderDetails.PayableAmount;
//                 userWallet.transactions.push(refundTransaction);
//                 await userWallet.save();
//                 console.log(`💰 Wallet updated! New Balance: ${userWallet.walletAmount}`);
//             } else {
//                 userWallet = await Wallet.create({
//                     userId: orderDetails.userId,
//                     walletAmount: orderDetails.PayableAmount,
//                     transactions: [refundTransaction]
//                 });
//                 console.log(`💰 New wallet created! Balance: ${userWallet.walletAmount}`);
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









// const generateInvoice = async (req, res) => {
//     try {
//         const { orderId } = req.params;

//         // Fetch order details with populated user and product details
//         const order = await Order.findById(orderId)
//             .populate("orderedItems.product")
//             .populate("userId");

//         if (!order) {
//             return res.status(404).send("Order not found");
//         }

//         // Create PDF document
//         const doc = new PDFDocument({ margin: 50 });
//         res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderId}.pdf`);
//         res.setHeader("Content-Type", "application/pdf");
//         doc.pipe(res);

//         // === Header ===
//         doc.fontSize(22).text("Cosmix", { align: "center", underline: true }).moveDown(1.5);

//         // === Order Details Section ===
//         doc.fontSize(12);
//         doc.text(`Order ID: ${order.orderId}`);
//         doc.text(`Customer Name: ${order.userId.name || "N/A"}`);
//         doc.text(`Payment Status: ${order.paymentStatus}`);
//         doc.moveDown(1.5);

//         // === Table Headers ===
//         const tableTop = doc.y; // Store Y position for table
//         doc
//             .font("Helvetica-Bold")
//             .text("Product Name", 50, tableTop)
//             .text("Price", 250, tableTop)
//             .text("Quantity", 350, tableTop)
//             .text("Total Price", 450, tableTop);

//         doc.moveDown(1);

//         // === Table Rows ===
//         let subtotal = 0;
//         order.orderedItems.forEach((item, index) => {
//             const rowY = tableTop + (index + 1) * 20;
//             const totalItemPrice = item.quantity * item.price;
//             subtotal += totalItemPrice;

//             doc
//                 .font("Helvetica")
//                 .text(item.product.productName, 50, rowY , { width: 180, ellipsis: true })
//                 .text(`Rs ${item.price.toFixed(2)}`, 250, rowY)
//                 .text(item.quantity.toString(), 350, rowY)
//                 .text(`₹ ${totalItemPrice.toFixed(2)}`, 450, rowY);
//         });

//         doc.moveDown(2);

//         // === Summary Section (Align Right) ===
//         const gstAmount = subtotal * 0.18;
//         const payableAmount = subtotal - order.discount + gstAmount;

//         doc
//             .font("Helvetica-Bold")
//             .text(`Subtotal: Rs${subtotal.toFixed(2)}`, 400, doc.y)
//             .text(`Discount: Rs${order.discount.toFixed(2)}`, 400, doc.y + 15)
//             .text(`GST (18%): Rs${gstAmount.toFixed(2)}`, 400, doc.y + 15)
//             .text(`Payable Amount: Rs${payableAmount.toFixed(2)}`, 400, doc.y + 15);

//         doc.end();
//     } catch (error) {
//         console.error("PDF Generation Error:", error);
//         res.status(500).send("Failed to generate invoice");
//     }
// };


const generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Fetch order details
        const order = await Order.findById(orderId)
            .populate("orderedItems.product")
            .populate("userId");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderId}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        // === Header ===
        doc.fontSize(22).text("Cosmix", { align: "center", underline: true }).moveDown(1.5);

        // === Order Details ===
        doc.fontSize(12);
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Customer Name: ${order.userId.name || "N/A"}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.moveDown(1.5);

        // 
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

            // Calculate max height of text
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

            startY += rowHeight; // Move to next row
        });

        doc.moveDown(2);

        // === Summary Section (Align Right) ===
        const gstAmount = subtotal * 0.3;
        // const payableAmount = subtotal - order.discount + gstAmount;

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
            { "address.$": 1 } // Fetch only the matched address
        );

        if (!addressDocument || !addressDocument.address.length) {
            console.log(" Address document not found for ID:", orderDetails.addressId);
            return res.redirect('/pageNotFound');
        }

        const addressDetails = addressDocument.address[0];

        const orderCreatedAt = new Date(orderDetails.createdAt);
        const returnDeadline = new Date(orderCreatedAt);
        returnDeadline.setDate(returnDeadline.getDate() + 7); // Add 7 days to order creation date
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

        // Set status to Pending Approval
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

        // Set status to Pending Approval
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

// Admin Approval Function
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

                // Restore stock if necessary
                for (let item of orderDetails.orderedItems) {
                    const product = await Product.findById(item.product);
                    if (product) {
                        product.quantity += item.quantity;
                        await product.save();
                    }
                }

                // Wallet Refund Logic
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

                // Wallet Refund Logic
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
            // If the admin rejects the request, revert to its original status
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




