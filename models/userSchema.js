

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
         type: String, 
         required: true 
        },
    phone:{type:String, unique:true, sparse:true,default:null},
    googleId:{type:String,unique:true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    otp: { type: String },  // Make optional
    otpExpiration: { type: Date }, // Optional
    isAdmin: {type: Boolean,default:false },
    isBlocked: {type: Boolean,default: false},
    role:{type:String},
    joindate:{type:Date}
});

module.exports = mongoose.model('User', userSchema);