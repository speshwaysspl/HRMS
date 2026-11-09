import mongoose from "mongoose";
import { Schema } from "mongoose";

const attendanceRegularizationSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true }, // yyyy-mm-dd
    requestedInTime: { type: String },
    requestedOutTime: { type: String },
    reason: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Indexes for the app's hot queries (non-unique: existing duplicates must not block startup).
attendanceRegularizationSchema.index({ employeeId: 1, date: 1 });
attendanceRegularizationSchema.index({ status: 1 });

const AttendanceRegularization = mongoose.model("AttendanceRegularization", attendanceRegularizationSchema);
export default AttendanceRegularization;
