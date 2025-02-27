
const mongoose = require('mongoose');
const env =require('dotenv').config()

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://shifanasaleem50:Shifana12345@cluster0.epxy2.mongodb.net/cosmixproject?retryWrites=true&w=majority&appName=Cluster0', {
  
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(error.message);
    process.exit(1); 
  }
};

module.exports = connectDB;
