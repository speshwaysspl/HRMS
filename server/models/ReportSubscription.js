import mongoose from "mongoose";
import { Schema } from "mongoose";

const reportSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    weeklySummaryEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ReportSubscription = mongoose.model("ReportSubscription", reportSubscriptionSchema);
export default ReportSubscription;
