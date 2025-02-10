const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address = require('../../models/addressSchema')



const loadOrderManagement = async(req,res)=>{
    if(req.session.admin){
    try {
        const orders = await Order.find().populate('userId').sort({createdAt:-1})

        // console.log(orders)

        res.render('ordermanagement',{orders})
        
    } catch (error) {
        console.error("error loading page ",error)
        res.redirect('/pageNotFound')
        
    }}
}

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

        // Update order status
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

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

module.exports={
    loadOrderManagement,loadOrderDetailsPage,
    updateOrderStatus,getOrderStatus,
    
}