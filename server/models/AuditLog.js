import mongoose from "mongoose";
const { Schema } = mongoose;

const auditLogSchema = new Schema({
  action: { type: String, required: true }, // e.g. OFFER_ACCEPTED, OFFER_REJECTED, DOC_VERIFIED, EMPLOYEE_CONVERTED
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate" },
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
  details: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
