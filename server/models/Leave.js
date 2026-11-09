import mongoose from "mongoose";
import { Schema } from "mongoose";

const leaveSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  leaveType: {
    type: String,
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  // Optional supporting document (medical certificate etc.), image or PDF.
  proof: { type: String, default: "" },
  proofName: { type: String, default: "" },
  // Comment from whoever approved/rejected (required when rejecting from the HR email).
  reviewRemark: { type: String, default: "" },
  appliedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for the app's hot queries (non-unique: existing duplicates must not block startup).
leaveSchema.index({ employeeId: 1, startDate: -1 });
leaveSchema.index({ status: 1, startDate: 1 });
leaveSchema.index({ appliedAt: -1 });

const Leave = mongoose.model("Leave", leaveSchema);
export default Leave;
