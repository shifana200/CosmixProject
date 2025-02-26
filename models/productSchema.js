const mongoose = require('mongoose');

const {Schema} = mongoose

const productSchema = new Schema({
    productName:{
        type:String,
            required: true
    },
    description:{
        type: String,
            required:true
    },
    details:{
        type: String,
            required:true
    },
   
    category:{
        type: Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    offer: { 
        type: mongoose.Schema.Types.ObjectId,
         ref: "Offer" },
         offerPrice: {
            type: Number, // This will hold the price after applying the offer
            required: true,
          },

    regularPrice:{
        type:Number,
        required:true
    },
    salePrice:{
        type:Number,
        required:true
    },
    offerPrice:{
        type: Number,
        default: 0
    },
    quantity:{
        type: Number,
        default: true 
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","Out of Stock","Discontinued"],
        required: true,
        default:"Available"
    }
},{timestamps:true})

productSchema.methods.calculateOfferPrice = function () {
    const product = this;
    const currentDate = new Date();
  
    if (
      product.offer &&
      product.offer.status === "Active" &&
      currentDate >= product.offer.startDate &&
      currentDate <= product.offer.endDate
    ) {
      let offerPrice = product.salePrice;
  
      if (product.offer.discountType === "Percentage") {
        offerPrice -= (product.salePrice * product.offer.discountValue) / 100;
      } else if (product.offer.discountType === "Fixed Amount") {
        offerPrice -= product.offer.discountValue;
      }
  
      // Ensure that the offer price doesn't go below zero
      offerPrice = Math.max(0, offerPrice);
  
      return offerPrice;
    }
  
    // If no valid offer, return salePrice
    return product.salePrice;
  };

const Product = mongoose.model("Product",productSchema)
module.exports = Product