const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  couponCode: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: true 
  },
  discountValue: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  minimumPurchase: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  maximumPurchase: { 
    type: Number, 
    min: 0 
  },
  startDate: { 
    type: Date,  
    required: true 
  },
  expiryDate: { 
    type: Date,  
    required: true 
  },
  usageLimit: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });  

module.exports = mongoose.model('Coupon', couponSchema);
