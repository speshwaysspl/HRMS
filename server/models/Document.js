import mongoose from "mongoose";
import { Schema } from "mongoose";

const documentSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate" },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fileUrl: { type: String, required: true },
  fileKey: { type: String }, // S3 Key for deletion
  fileType: { type: String },
  originalName: { type: String },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  comments: { type: String },
  documentType: {
    type: String,
    enum: ["ID Proof", "Educational Certificate", "Offer Letter", "Contract", "Other"],
    default: "Other",
  },
  expiryDate: { type: Date, default: null },
  version: { type: Number, default: 1 },
  previousVersionId: { type: Schema.Types.ObjectId, ref: "Document", default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Document = mongoose.model("Document", documentSchema);
export default Document;
