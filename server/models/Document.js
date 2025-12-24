import mongoose from "mongoose";
import { Schema } from "mongoose";

const documentSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String },
  originalName: { type: String },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  comments: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Document = mongoose.model("Document", documentSchema);
export default Document;
