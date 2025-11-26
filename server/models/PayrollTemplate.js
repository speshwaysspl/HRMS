// backend/models/PayrollTemplate.js
import mongoose, { Schema } from "mongoose";

const payrollTemplateSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    templateName: { type: String, required: true, trim: true },
    
    // Employee Basic Info (auto-filled from Employee model)
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    joiningDate: { type: Date },
    location: { type: String, trim: true, default: "" },
    
    // Bank Details
    bankname: { type: String, trim: true, default: "" },
    bankaccountnumber: { type: String, trim: true, default: "" },
    
    // Identity Details
    pan: { type: String, trim: true, default: "" },
    uan: { type: String, trim: true, default: "" },
    
    // Salary Structure - Earnings
    basicSalary: { type: Number, required: true, min: 0 },
    da: { type: Number, default: 0, min: 0 }, // Dearness Allowance
    hra: { type: Number, default: 0, min: 0 }, // House Rent Allowance
    conveyance: { type: Number, default: 0, min: 0 },
    medicalallowances: { type: Number, default: 0, min: 0 },
    specialallowances: { type: Number, default: 0, min: 0 },
    
    // Salary Structure - Deductions
    proftax: { type: Number, default: 0, min: 0 }, // Professional Tax
    pf: { type: Number, default: 0, min: 0 }, // Provident Fund
    deductions: { type: Number, default: 0, min: 0 }, // Other deductions
    
    // Calculation Settings
    
    // Auto-calculation flags
    autoCalculatePF: { type: Boolean, default: false }, // Auto calculate PF as % of basic
    pfPercentage: { type: Number, default: 12, min: 0, max: 100 }, // PF percentage of basic salary
    
    // Template Status
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false }, // Default template for the employee
    
    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    // Notes
    notes: { type: String, trim: true, default: "" }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for total earnings calculation
payrollTemplateSchema.virtual('totalEarnings').get(function() {
  return (
    (this.basicSalary || 0) +
    (this.da || 0) +
    (this.hra || 0) +
    (this.conveyance || 0) +
    (this.medicalallowances || 0) +
    (this.specialallowances || 0)
  );
});

// Virtual for total deductions calculation
payrollTemplateSchema.virtual('totalDeductions').get(function() {
  return (
    (this.proftax || 0) +
    (this.pf || 0) +
    (this.deductions || 0)
  );
});

// Virtual for net salary calculation
payrollTemplateSchema.virtual('netSalary').get(function() {
  return Math.max(0, this.totalEarnings - this.totalDeductions);
});

// Index for faster queries
payrollTemplateSchema.index({ employeeId: 1, isActive: 1 });
payrollTemplateSchema.index({ employeeId: 1, isDefault: 1 });

// Pre-save middleware to ensure only one default template per employee
payrollTemplateSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default flag from other templates of the same employee
    await this.constructor.updateMany(
      { 
        employeeId: this.employeeId, 
        _id: { $ne: this._id },
        isDefault: true 
      },
      { isDefault: false }
    );
  }
  next();
});

const PayrollTemplate = mongoose.model("PayrollTemplate", payrollTemplateSchema);
export default PayrollTemplate;