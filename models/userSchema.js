

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
         type: String, 
         required: true 
        },
    phone:{
        type:String, 
        unique:true,
         sparse:true,
         
        },
    googleId:{
        type:String,
        unique:true
    },
    email: {
         type: String,
          required: true, 
          unique: true 
        },
    password: { 
        type: String,
         required: false 
        },
    otp: { 
        type: String 
    },  
    referralCode: {
         type: String, 
         unique: true 
        },
        referredBy: { type: String, default: null },
       
    wallet: {
         type: Number,
          default: 0 
        },
    otpExpiration: { 
        type: Date
     }, // Optional
    isAdmin: {
        type: Boolean,
        default:false 
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    role:{
        type:String
    },
    joindate:{
        type:Date
    }
});

userSchema.pre("save", async function (next) {
    if (!this.referralCode) {
        let isUnique = false;
        let newCode;

        while (!isUnique) {
            newCode = `COSREF${Math.floor(100000 + Math.random() * 900000)}`; // Generate COSREF + 6-digit number
            const existingUser = await mongoose.model("User").findOne({ referralCode: newCode });

            if (!existingUser) {
                isUnique = true;
            }
        }

        this.referralCode = newCode;
    }
    next();
});

module.exports = mongoose.model('User', userSchema);