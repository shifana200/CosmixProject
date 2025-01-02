
const mongoose = require('mongoose');
const env =require('dotenv').config()

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/cosmixproject', { // Replace with your database name
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(error.message);
    process.exit(1); // Exit the process with failure
  }
};

module.exports = connectDB;
