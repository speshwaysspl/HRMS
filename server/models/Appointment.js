import mongoose from "mongoose";
const { Schema } = mongoose;

const appointmentSchema = new Schema({
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
  designation: { type: String, required: true },
  department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
  salaryPackage: { type: Number, required: true }, // CTC in INR
  joiningDate: { type: Date, required: true },
  reportingTime: { type: String, default: "09:00" },
  appointmentLetterUrl: { type: String },
  appointmentLetterKey: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Sent", "Accepted"],
    default: "Pending"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
