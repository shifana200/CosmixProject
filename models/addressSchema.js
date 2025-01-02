const mongoose = require('mongoose');
const { type } = require('os');
const {Schema} = mongoose()

const addressSchema = new Schema({

    userId: {
        type: Schema.Types.ObjectId,
        ref:"User",
        required: true
    },
    address: [{
        addressType:{
            type:String,
            required: true
        },
        name:{
            type: String,
            required: true
        },
        city:{
            type:String,
            required: true
        },
        landMark:{
            type: string,
            required:true
        },
        state:{
            type: string,
            required:true
        },
        pincode:{
            type: Number,
            required:true
        },
        phone:{
            type: string,
            required:true
        },
        altPhone:{
            type: string,
            required:true
        }
    }]
     

})

const Address = mongoose.model("Address",addressSchema)
module.exports = Address;