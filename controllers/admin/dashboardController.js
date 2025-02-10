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
        }).populate("userId", "name"); 

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








// // Get sales report
// const salesReport =  async (req, res) => {
//     try {
//         const { filter, startDate, endDate } = req.query;
//         let start, end;

//         if (filter === "daily") {
//             start = moment().startOf("day").toDate();
//             end = moment().endOf("day").toDate();
//         } else if (filter === "weekly") {
//             start = moment().startOf("week").toDate();
//             end = moment().endOf("week").toDate();
//         } else if (filter === "monthly") {
//             start = moment().startOf("month").toDate();
//             end = moment().endOf("month").toDate();
//         } else if (filter === "yearly") {
//             start = moment().startOf("year").toDate();
//             end = moment().endOf("year").toDate();
//         } else if (filter === "custom") {
//             start = new Date(startDate);
//             end = new Date(endDate);
//         } else {
//             return res.status(400).json({ success: false, message: "Invalid filter" });
//         }

//         // Aggregate sales data
//         const sales = await Order.aggregate([
//             {
//                 $match: {
//                     createdAt: { $gte: start, $lte: end },
//                     status: "Delivered"
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSales: { $sum: "$totalAmount" },
//                     totalOrders: { $sum: 1 },
//                     totalDiscount: { $sum: "$discount" }
//                 }
//             }
//         ]);

//         res.json({ success: true, data: sales[0] || {} });

//     } catch (error) {
//         console.error("Error fetching sales report:", error);
//         res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// }

// // Generate PDF Report
// const salesReportPdf = async (req, res) => {
//     try {
//         const sales = await Order.find().sort({ createdAt: -1 });
//         const doc = new PDFDocument();
//         res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");
//         res.setHeader("Content-Type", "application/pdf");
//         doc.pipe(res);

//         doc.fontSize(18).text("Sales Report", { align: "center" });
//         doc.moveDown();

//         sales.forEach((order, index) => {
//             doc.fontSize(12).text(
//                 `${index + 1}. Order ID: ${order._id}, Total: $${order.totalAmount}, Discount: $${order.discount}`
//             );
//             doc.moveDown();
//         });

//         doc.end();
//     } catch (error) {
//         console.error("Error generating PDF report:", error);
//         res.status(500).json({ success: false, message: "Failed to generate PDF" });
//     }
// }

// // Generate Excel Report
// const salesReportExcel =  async (req, res) => {
//     try {
//         const sales = await Order.find().sort({ createdAt: -1 });
//         const workbook = new excelJS.Workbook();
//         const worksheet = workbook.addWorksheet("Sales Report");

//         worksheet.columns = [
//             { header: "Order ID", key: "_id", width: 30 },
//             { header: "Total Amount", key: "totalAmount", width: 20 },
//             { header: "Discount", key: "discount", width: 20 },
//             { header: "Date", key: "createdAt", width: 20 }
//         ];

//         sales.forEach((order) => worksheet.addRow(order));
//         res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");
//         res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

//         return workbook.xlsx.write(res).then(() => res.end());
//     } catch (error) {
//         console.error("Error generating Excel report:", error);
//         res.status(500).json({ success: false, message: "Failed to generate Excel" });
//     }
// }

module.exports = {
   loadDashboard,salesReport,
}
