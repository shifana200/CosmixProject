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
        },
        currentStatus:{
            type:String,
            required:true,
            enum:["Cancelled" ,"Returned","ordered"],
            default:"ordered"
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
    addressId:{
        type:Schema.Types.ObjectId,
        ref:"Address",
        required:true
    },
    invoiceData:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Ordered','Shipped','Delivered','Cancelled','Returned','Return Pending' ,'Cancellation Pending','Request Rejected']

    },
    CancellationReason:{
        type:String,
        default:"None"
    },
    returnReason: {
        type: String,
        default: null
    },
    returnProcessed: {
        type: Boolean,
        default: false  // To track if return has been processed
    },
    refundStatus: {
        type: String,
        enum: ['Not Initiated', 'Processing', 'Completed', 'Failed'],
        default: 'Not Initiated'
    }, refundedAmount: {
        type: Number,
        default: 0  // To track the refunded amount in case of return or cancellation
    },

    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'Paid', 'failed'],
         default: 'pending'
         },
         razorpayPaymentStatus: {
             type: String,
              enum: ['pending', 'Paid', 'failed',"NA"],
               default: 'pending' 
            },
         razorpayOrderId: {
             type: String 
            },
         razorpayPaymentId: {
             type: String 
            },
         razorpaySignature: {
             type: String 
            },
        
        paymentMethod :{
            type:String,
            enum:["COD","Online Payment","Wallet"]
        }

},{
    timestamps:true})

const Order = mongoose.model("Order",orderSchema)
module.exports = Order;