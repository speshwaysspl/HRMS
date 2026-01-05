import mongoose from "mongoose";

const dailyQuoteSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DailyQuote = mongoose.model("DailyQuote", dailyQuoteSchema);
export default DailyQuote;
