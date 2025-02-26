const express = require("express");
const router = express.Router();
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const moment = require("moment");
const PDFDocument = require("pdfkit"); 
const excelJS = require("exceljs"); 


const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            // Fetch all users and products
            const users = await User.find();
            const products = await Product.find();
            const orders = await Order.find();


            const deliveredOrdersCount = await Order.countDocuments({ status: "Delivered" });

            const totalRevenue = await Order.aggregate([
                { 
                    $group: { 
                        _id: null, 
                        totalRevenue: { $sum: "$PayableAmount" } 
                    } 
                }
            ]);

            const revenueAmount = totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0;

            // Calculate total sales and total discount
            let totalSales = 0;
            let totalDiscount = 0;

            orders.forEach(order => {
                totalSales += order.totalPrice;  // Ensure field name matches schema
                totalDiscount += order.discount;
            });

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get start of the week (last 7 days)
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);

            // Get start of the month
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            // Get start of the year
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

            // Filter sales data
            const dailySales = orders.filter(order => new Date(order.createdOn) >= today);
            const weeklySales = orders.filter(order => new Date(order.createdOn) >= lastWeek);
            const monthlySales = orders.filter(order => new Date(order.createdOn) >= firstDayOfMonth);
            const yearlySales = orders.filter(order => new Date(order.createdOn) >= firstDayOfYear);

            // Calculate total amounts for each period
            const calculateTotal = (orders) => orders.reduce((sum, order) => sum + order.totalPrice, 0);

            const totalDailySales = calculateTotal(dailySales);
            const totalWeeklySales = calculateTotal(weeklySales);
            const totalMonthlySales = calculateTotal(monthlySales);
            const totalYearlySales = calculateTotal(yearlySales);

            // Render the dashboard page
            res.render("dashboard", {
                users,
                orders,
                products,
                totalSales,
                totalDiscount,
                totalDailySales,
                totalWeeklySales,
                totalMonthlySales,
                totalYearlySales,
                deliveredOrdersCount,

                revenueAmount
            });

        } catch (error) {
            console.error("Error loading dashboard:", error);
            res.redirect("/pageNotFound");
        }
    } else {
        res.redirect("/admin/login");
    }
};

const salesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let start, end;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filter) {
            case "daily":
                start = today;
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
                break;
            case "weekly":
                start = new Date(today);
                start.setDate(today.getDate() - 7);
                end = today;
                break;
            case "monthly":
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case "yearly":
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            case "custom":
                start = new Date(startDate);
                end = new Date(endDate);
                break;
            default:
                return res.status(400).json({ message: "Invalid filter option" });
        }

        // Fetch orders within the selected date range and populate user details
        const orders = await Order.find({
            createdOn: { $gte: start, $lte: end },
            status: "Delivered"  // Filter for delivered orders only
        }).populate("userId", "name").sort({createdAt:-1}); 

        // Format response data correctly
        const reportData = orders.map(order => ({
            orderId: order.orderId,   // Ensure you use the correct field name
            customerName: order.userId ? order.userId.name : "Guest",  // Fetch populated user name
            PayableAmount: order.PayableAmount || 0.00,  // Use correct schema field
            discount: order.discount || 0,  // Ensure discount field is fetched correctly
            date: order.createdOn.toISOString().split('T')[0] // Format date
        }));

        res.json({ success: true, reportData });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



const getTopSellingProducts = async (req, res) => {
    try {
        const { filter } = req.query; // 'daily', 'monthly', 'yearly'

        // Get the start and end date based on the selected filter
        let startDate, endDate;
        if (filter === 'daily') {
            startDate = moment().startOf('day').toDate();
            endDate = moment().endOf('day').toDate();
        } else if (filter === 'monthly') {
            startDate = moment().startOf('month').toDate();
            endDate = moment().endOf('month').toDate();
        } else if (filter === 'yearly') {
            startDate = moment().startOf('year').toDate();
            endDate = moment().endOf('year').toDate();
        }

        console.log(`Filtering orders between ${startDate} and ${endDate}`);

        // Find all orders that are delivered within the selected date range
        const orders = await Order.find({
            status: 'Delivered',
            createdOn: { $gte: startDate, $lte: endDate }
        }).populate('orderedItems.product'); // Populate the product details

        console.log(`Found ${orders.length} orders`);

        // Calculate total sold for each product
        const productSales = {};
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                const productId = item.product._id.toString();
                if (productSales[productId]) {
                    productSales[productId].totalSold += item.quantity;
                } else {
                    productSales[productId] = {
                        productName: item.product.productName,
                        totalSold: item.quantity
                    };
                }
            });
        });

        console.log('Product sales data:', productSales);

        // Convert to an array for sorting and response
        const topSellingProducts = Object.values(productSales);
        topSellingProducts.sort((a, b) => b.totalSold - a.totalSold); // Sort by total sold

        console.log('Sorted top selling products:', topSellingProducts);

        res.json(topSellingProducts); // Send the data as JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

  
const getTopCategories = async (req, res) => {
    try {
      const { filter } = req.query; // 'daily', 'monthly', or 'yearly'
  
      const dateFilter = getDateFilter(filter); // Function to get date filter based on daily, monthly, yearly
  
      // Aggregate the orders to get the top categories
      const topCategories = await Order.aggregate([
        { $unwind: '$orderedItems' },
        { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productDetails' } },
        { $unwind: '$productDetails' },
        { $lookup: { from: 'categories', localField: 'productDetails.category', foreignField: '_id', as: 'categoryDetails' } },
        { $unwind: '$categoryDetails' },
        { $match: { createdAt: { $gte: dateFilter.startDate, $lt: dateFilter.endDate } } },
        { $group: { _id: '$categoryDetails._id', categoryName: { $first: '$categoryDetails.name' }, totalSold: { $sum: '$orderedItems.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 6 } // Assuming we have 6 categories in total
      ]);
  
      res.json(topCategories);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching top categories' });
    }
  };
  
  // Helper function to generate date range for daily, monthly, yearly filters
  const getDateFilter = (filter) => {
    const now = new Date();
    let startDate, endDate;
  
    switch (filter) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0)); // Start of today
        endDate = new Date(now.setHours(23, 59, 59, 999)); // End of today
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the current month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of the current month
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1); // Start of the current year
        endDate = new Date(now.getFullYear(), 12, 31); // End of the current year
        break;
      default:
        startDate = new Date(0); // Beginning of time for undefined filters
        endDate = new Date(); // Now
    }
  
    return { startDate, endDate };
  };
  


module.exports = {
   loadDashboard,salesReport,getTopSellingProducts,getTopCategories,
}
