// backend/models/Salary.js
import mongoose, { Schema } from "mongoose";

const salarySchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },

    // Identity & HR
    name: { type: String, trim: true },
    joiningDate: { type: Date, required: true },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    location: { type: String, trim: true },

    

    // Period
    month: { type: String, required: true, trim: true }, // e.g., "August"
    year: { type: Number, required: true }, // e.g., 2025

    // Attendance
    workingdays: { type: Number, default: 0, min: 0, max: 31 },
    lopDays: { type: Number, default: 0, min: 0 },
    lopamount: { type: Number, default: 0, min: 0 },

    // Bank
    bankname: { type: String, trim: true },
    bankaccountnumber: { type: String, trim: true },

    // New fields
    pan: { type: String, trim: true, default: "" },
    uan: { type: String, trim: true, default: "" },

    // Earnings
    basicSalary: { type: Number, required: true },
    da: { type: Number },
    hra: { type: Number },
    conveyance: { type: Number },
    medicalallowances: { type: Number },
    specialallowances: { type: Number },
    allowances: { type: Number },

    // Deductions
    proftax: { type: Number },
    pf: { type: Number },
    deductions: { type: Number },

    // Totals
    netSalary: { type: Number },

    // Optional (if you ever store a file/URL)
    pdfUrl: { type: String, trim: true },

    payDate: { type: Date, required: true },
  },
  { timestamps: true } // createdAt, updatedAt
);

const Salary = mongoose.model("Salary", salarySchema);
export default Salary;
