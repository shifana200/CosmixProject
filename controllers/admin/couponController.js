const Coupon = require('../../models/couponSchema')
function formatDate(dateString) {
    const date = new Date(dateString); 
    return date.toISOString().split("T")[0];
     // Ensure it's in correct date object format
    // const day = String(date.getDate()).padStart(2, '0');
    // const month = String(date.getMonth() + 1).padStart(2, '0');
    // const year = date.getFullYear().toString().slice(-2);  // Get the last two digits of the year
    // return `${day}/${month}/${year}`;
}




const loadCouponManagement = async(req,res)=>{
    if(req.session.admin){
       try {
        const coupons = await Coupon.find().sort({createdAt:-1});
        coupons.forEach(coupon => {
            coupon.startDate = formatDate(coupon.startDate);
            coupon.expiryDate = formatDate(coupon.expiryDate);
        });

           res.render('couponmanagement',{coupons})
       } catch (error) {
           res.redirect('/pageNotFound')
       }
   }
}

const addCoupon = async (req, res) => {
    try {
        const { 
            couponCode, discountType, discountValue, 
            minimumPurchase, maximumPurchase, 
            startDate, expiryDate, usageLimit 
        } = req.body;

        // Check if the coupon already exists
        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).send("Coupon code already exists.");
        }
        function formatDate(dateString) {
            const date = new Date(dateString); 
            return date.toISOString().split("T")[0];}

            const formattedStartDate = formatDate(startDate);
            const formattedExpiryDate = formatDate(expiryDate);
            
        // Create new coupon
        const newCoupon = new Coupon({
            couponCode,
            discountType,
            discountValue,
            minimumPurchase,
            maximumPurchase,
            startDate: formattedStartDate,  // This will automatically store it in UTC
            expiryDate: formattedExpiryDate,
            usageLimit
        });

        await newCoupon.save(); // Save to database
        res.redirect("/admin/couponmanagement"); // Redirect to coupons list
    } catch (error) {
        console.error("Error adding coupon:", error);
        res.status(500).send("Server Error");
    }
}

const couponStatus =  async (req, res) => {
    try {
        const couponId = req.params.id;
        const { isActive } = req.body; // Get the new active status

        // Find and update the coupon's isActive status
        const coupon = await Coupon.findByIdAndUpdate(couponId, { isActive }, { new: true });

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.json({ success: true, coupon });
    } catch (error) {
        console.error("Error updating coupon status:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        
        // Find the coupon by ID and delete it
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const getCouponDetails = async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};



const editCoupon = async (req, res) => {

    try {
        const { couponId } = req.body;
        console.log(couponId)

        const {
            
            editCouponCodeInput,
            editDiscountType,
            editDiscountValue,
            editMinimumPurchase,
            editMaximumPurchase,
            editStartDate,
            editExpiryDate,
            editUsageLimit
        } = req.body;

        console.log("Received data:", req.body);


        // Check if couponId exists
        if (!couponId) {
            return res.status(400).json({ success: false, message: "Coupon ID is missing" });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                couponCode: editCouponCodeInput,
                discountType: editDiscountType,
                discountValue: editDiscountValue,
                minimumPurchase: editMinimumPurchase,
                maximumPurchase: editMaximumPurchase,
                startDate: new Date(editStartDate),
                expiryDate: new Date(editExpiryDate),
                usageLimit: editUsageLimit
            },
            { new: true } // Return the updated document
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.json({ success: true, message: "Coupon updated successfully" });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const searchCoupon =  async (req, res) => {
    try {
        const query = req.query.query;
        
        if (!query) {
            return res.json(await Coupon.find()); // Return all coupons if query is empty
        }

        let searchConditions = [];

        if (!isNaN(query)) {
            // If query is a number, search in numeric fields
            searchConditions.push(
                { minimumPurchase: parseFloat(query) },
                { maximumPurchase: parseFloat(query) }
            );
        } else {
            // If query is text, search in couponCode (case-insensitive)
            searchConditions.push({ couponCode: { $regex: query, $options: "i" } });
        }

        const coupons = await Coupon.find({ $or: searchConditions });

        res.json(coupons);
    } catch (error) {
        console.error("Error searching coupons:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}






module.exports={
    loadCouponManagement,
    addCoupon,couponStatus,
    deleteCoupon,getCouponDetails,editCoupon,searchCoupon,
}