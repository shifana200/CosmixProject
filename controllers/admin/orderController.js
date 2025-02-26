const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address = require('../../models/addressSchema')
const Wallet = require('../../models/walletSchema')

const loadOrderManagement = async (req, res) => {
    if (req.session.admin) {
        try {
            const page = parseInt(req.query.page) || 1; // Get the current page from query params, default to 1
            const limit = 5; // Number of orders per page
            const skip = (page - 1) * limit;

            const totalOrders = await Order.countDocuments(); // Get total number of orders
            const totalPages = Math.ceil(totalOrders / limit); // Calculate total pages

            const orders = await Order.find()
                .populate('userId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            res.render('ordermanagement', { 
                orders, 
                currentPage: page, 
                totalPages 
            });

        } catch (error) {
            console.error("Error loading order management page:", error);
            res.redirect('/pageNotFound');
        }
    }
};


const loadOrderDetailsPage = async (req, res) => {
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

        res.render('orderDetailsPage', { orderDetails, addressDetails });

    } catch (error) {
        console.error(" Error loading order details:", error);
        return res.redirect('/pageNotFound');
    }
};





const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        console.log("Updating Order Status...");
        console.log(" Order ID:", orderId);
        console.log(" New Status:", status);

        // Validate input
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: "Invalid request data." });
        }

        // Find the current order
        const existingOrder = await Order.findById(orderId);

        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Prevent status change if already "Delivered"
        if (existingOrder.status === "Delivered") {
            return res.status(403).json({ success: false, message: "Order has already been delivered and cannot be changed." });
        }

        let updateData = { status };

        // If the order is COD and being delivered, update payment status to "Paid"
        if (status === "Delivered" && existingOrder.paymentMethod === "COD" && existingOrder.paymentStatus === "pending") {
            updateData.paymentStatus = "Paid";
        }

        // Update order status
        const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });

        console.log("✅ Order Updated:", updatedOrder);
        return res.status(200).json({ success: true, message: "Order status updated successfully.", updatedOrder });

    } catch (error) {
        console.error(" Error updating order status:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};


 const getOrderStatus =  async (req, res) => {
    try {
        const { orderId } = req.query;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required." });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        return res.status(200).json({ success: true, status: order.status });

    } catch (error) {
        console.error(" Error fetching order status:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error." });
    }
}

const confirmOrderRequest = async (req, res) => {
    try {
        const { orderId, action } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send("Order not found");
        }

        if (action === "accept") {
            if (order.status === "Cancellation Pending") {
                order.status = "Cancelled";
                await processWalletRefund(order, "Cancellation");
                
            } else if (order.status === "Return Pending") {
                order.status = "Returned";
                await processWalletRefund(order, "Return");
                order.returnProcessed = true;

            }
        }  else if (action === "reject") {
            // If rejected, reset the status to its previous state
            if (order.status === "Cancellation Pending") {
                order.status = order.cancellationReason ? "Ordered" : "Shipped";
            } else if (order.status === "Return Pending") {
                order.status = "Delivered"; // Reset to Delivered if return request was rejected
            }
        }
        order.cancellationReason = null;
        order.returnReason = null;

        await order.save();

        res.redirect(`/admin/ordermanagement/${orderId}`);
    } catch (error) {
        console.error("Error processing order confirmation:", error);
        res.status(500).send("Server error");
    }
};

const processWalletRefund = async (order, type) => {
    try {
        const userId = order.userId._id;
        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({ userId, walletAmount: 0, transactions: [] });
        }
        const refundAmount = order.totalPrice;
        wallet.walletAmount += refundAmount;
        wallet.transactions.push({
            amount: refundAmount,
            transactionType: type, 
        });

        await wallet.save();
        console.log(`Refund of ${refundAmount} credited to wallet for ${type}`);
    } catch (error) {
        console.error("Error processing wallet refund:", error);
    }
};



const searchOrder = async (req, res) => {
    try {
        const { query } = req.query;

        let searchCriteria = {};

        if (!query) {
            return res.json([]); // Return empty array if query is not provided
        }

        if (!isNaN(query)) {
            // If query is a number, it could be an orderId or status
            searchCriteria = { $or: [{ orderId: query }, { status: query }] };
        } else {
            // If query is text, search in username
            const users = await User.find({ name: { $regex: query, $options: "i" } }).select("_id");
            const userIds = users.map(user => user._id);

            searchCriteria = { 
                $or: [
                    { orderId: query },
                    { userId: { $in: userIds } },
                    { status: { $regex: query, $options: "i" } }
                ]
            };
        }

        const orders = await Order.find(searchCriteria).populate("userId", "name");

        res.json(orders);
    } catch (error) {
        console.error("Error searching orders:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports={
    loadOrderManagement,loadOrderDetailsPage,
    updateOrderStatus,getOrderStatus,confirmOrderRequest,
    processWalletRefund,searchOrder,
    
}