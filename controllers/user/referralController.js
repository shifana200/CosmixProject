const User = require("../models/userModel");


const generateReferralCode = () => {
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase(); 
  return `COSREF${randomString}`; 
};

