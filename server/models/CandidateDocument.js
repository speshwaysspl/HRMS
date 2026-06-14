import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const documentItemSchema = new mongoose.Schema({
  documentType: {
    type: String,
    enum: [
      "Aadhaar",
      "PAN",
      "Bank Passbook",
      "Aadhaar Card",
      "PAN Card",
      "Passport",
      "SSC Certificate",
      "Intermediate Certificate",
      "Degree Certificate",
      "Resume",
      "Experience Letter",
      "Relieving Letter",
      "Passbook",
      "Cancelled Cheque",
      "Passport Photo",
      "Signature"
    ],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileKey: {
    type: String // AWS S3 key, useful for deleting
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  rejectionReason: {
    type: String,
    default: ""
  },
  reUploadDate: {
    type: Date
  },
  comments: [commentSchema]
});

const candidateDocumentSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  documents: [documentItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const CandidateDocument = mongoose.model("CandidateDocument", candidateDocumentSchema);
export default CandidateDocument;
