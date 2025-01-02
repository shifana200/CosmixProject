// const mongoose = require('mongoose');
// const {Schema} = mongoose;

// const userSchema = new mongoose.Schema({
//     name: {
//         type: String,
//         required:true,
//         trim: true,
//       },
//       email: {
//         type: String,
//         required:true,
//         unique: true,
        
//       },
//       password: {
//         type: String,
//         required:true,
//       },
//       phone: {
//         type: String,
//         required: true,
//       },
//       googleId: {
//         type:String,
//         required:false
//       },
//       isBlocked: {
//         type: Boolean,
//         default: false
//       },
//       isAdmin: {
//         type: Boolean,
//         default:false
//       },
//       cart: [{
//         type: Schema.Types.ObjectId,
//         ref:"Cart",
//       }],
//       wallet:[{
//         type: Schema.Types.ObjectId,
//         ref:"Wishlist",
//       }],
//       orderHistory:[{
//         type: Schema.Types.ObjectId,
//         ref:"Order",
//       }],
//       createdOn:{
//         type:Date,
//         default: Date.now,
//       },
//       referalCode:{
//         type:String
//       },
//       redeemed:{
//         type:Boolean
//       },
//       redeemedUsers:[{
//         type: Schema.Types.ObjectId,
//         ref:"User"
//       }],
//       searchHistory:[{
//         category:{
//             type:Schema.Types.ObjectId,
//             ref:"Category"
//         },
//         brand: {
//             type: String
//         },
//         searchOn :{
//             type: Date,
//             default: Date.now
//         }
//       }]


// })

// const User = mongoose.model("User",userSchema)
// module.exports = User

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
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