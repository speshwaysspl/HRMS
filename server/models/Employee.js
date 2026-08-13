import mongoose from "mongoose";
import { Schema } from "mongoose";

const employeeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  employeeId: { type: String, required: true, unique: true },
  dob: { type: Date },
  joiningDate: { type: Date },
  gender: { type: String },
  mobilenumber: { type: String },
  designation: { type: String },
  department: { type: Schema.Types.ObjectId, ref:"Department", required: true },
  reportsTo: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
  shiftId: { type: Schema.Types.ObjectId, ref: "Shift", default: null },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  salaryPackage: { type: Number, default: null }, // annual CTC in INR, used to prefill payslip earnings
  pan: { type: String, trim: true, default: "" },
  uan: { type: String, trim: true, default: "" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
// nono4of