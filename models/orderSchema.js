const { CancellationToken } = require('mongodb');
const mongoose = require('mongoose')
const Schema = mongoose.Schema


const orderSchema = new Schema({
    orderId:{
        type:String,
        unique :true

    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    PayableAmount:{
        type:Number,
        required:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    invoiceData:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Ordered','Shipped','Delivered','Cancelled','Returned']

    },
    CancellationReason:{
        type:String,
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    }
})

const Order = mongoose.model("Order",orderSchema)
module.exports = Order;