import mongoose from "mongoose";
import { Schema } from "mongoose";

const leaveTypeSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  monthlyQuota: { type: Number, default: 1 },
  annualQuota: { type: Number, default: 12 },
  requiresApproval: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);
export default LeaveType;
