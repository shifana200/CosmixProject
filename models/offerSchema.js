const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["Category", "Product"], required: true },
    categoryOrProduct: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "type",
      required: true,
    },
    discountType: { type: String, enum: ["Percentage", "Fixed Amount"], required: false },
    discountValue: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    description: { type: String },
  },
  { timestamps: true }
);
const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;