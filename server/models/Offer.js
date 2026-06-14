import mongoose from "mongoose";
const { Schema } = mongoose;

const offerSchema = new Schema({
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
  designation: { type: String, required: true },
  department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
  reportingManager: { type: Schema.Types.ObjectId, ref: "User", required: true },
  salaryPackage: { type: Number, required: true }, // CTC in INR (e.g. 600000)
  joiningDate: { type: Date, required: true },
  reportingTime: { type: String, default: "09:00" },
  workLocation: { type: String, required: true },
  probationPeriod: { type: String, required: true }, // e.g. "6 months"
  noticePeriod: { type: String, required: true }, // e.g. "2 months"
  offerLetterUrl: { type: String }, // S3 url (or local path)
  offerLetterKey: { type: String }, // S3 key
  status: {
    type: String,
    enum: ["Pending", "Sent", "Accepted", "Rejected", "Revoked"],
    default: "Pending"
  },
  expiryDate: { type: Date },
  version: { type: Number, default: 1 },
  versionHistory: [
    {
      designation: { type: String },
      salaryPackage: { type: Number },
      joiningDate: { type: Date },
      version: { type: Number },
      updatedAt: { type: Date, default: Date.now },
      updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
    }
  ],
  acceptanceDate: { type: Date },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Offer = mongoose.model("Offer", offerSchema);
export default Offer;
