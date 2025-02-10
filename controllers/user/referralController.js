const User = require("../models/userModel");

// Function to generate a unique referral code
const generateReferralCode = () => {
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate random letters/numbers
  return `COSREF${randomString}`; // Example: COSREFXK8JQZ
};

