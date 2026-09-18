import mongoose from "mongoose";
const { Schema } = mongoose;

const accountDeletionRequestSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    identifier: { type: String, required: true }, // Email or Employee ID submitted
    name: { type: String },
    department: { type: String },
    reason: { type: String },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "completed"],
      default: "pending"
    },
    requestedVia: {
      type: String,
      enum: ["mobile_app", "web_portal", "public_url"],
      default: "mobile_app"
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNotes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const AccountDeletionRequest = mongoose.model("AccountDeletionRequest", accountDeletionRequestSchema);
export default AccountDeletionRequest;
