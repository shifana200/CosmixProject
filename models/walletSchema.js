const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    amount: { type: Number, required: true }, // Positive for credit, negative for debit
    transactionType: { 
        type: String, 
        enum: ['Cancellation', 'Return', 'Referral', 'Purchase', 'Cashback', 'Wallet Payment'], 
        required: true 
    },
    timestamp: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    walletAmount: { type: Number, default: 0 },
    transactions: [transactionSchema] // Stores all transactions
});

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;
