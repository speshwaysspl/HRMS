// backend/controllers/payslipController.js
import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import PayrollTemplate from "../models/PayrollTemplate.js";
import Department from "../models/Department.js";
import { generateSalaryPDF, generateSalaryPDFBuffer } from "../utils/pdfGenerator.js";
import sendEmail from "../utils/sendEmail.js";

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Auto-fetch employee details by employee ID
export const getEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findOne({ employeeId })
      .populate('userId', 'name email')
      .populate('department', 'dep_name');
    
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }
    
    // Get default payroll template if exists
    const template = await PayrollTemplate.findOne({ 
      employeeId: employee._id, 
      isDefault: true, 
      isActive: true 
    });
    
    const employeeDetails = {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.userId.name,
      email: employee.userId.email,
      designation: employee.designation,
      department: employee.department.dep_name,
      dob: employee.dob,
      joiningDate: employee.joiningDate, // Add joining date to the response
      gender: employee.gender,
      mobilenumber: employee.mobilenumber,
      template: template || null
    };
    
    return res.status(200).json({ success: true, employee: employeeDetails });
  } catch (error) {
    console.error("Get Employee Details error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};



// Helper function to calculate working days (total calendar days)
function getWorkingDaysInMonth(year, month) {
  // Return total calendar days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return daysInMonth;
}

// Generate payslip with auto-calculations
export const generatePayslip = async (req, res) => {
  try {
    const payload = req.body;
    
    // Auto-fetch employee details if employeeId is provided
    let employeeDetails = null;
    if (payload.employeeId && !payload.name) {
      const employee = await Employee.findOne({ employeeId: payload.employeeId })
        .populate('userId', 'name email')
        .populate('department', 'dep_name');
      
      if (employee) {
        employeeDetails = {
          name: employee.userId.name,
          designation: employee.designation,
          department: employee.department.dep_name,
          joiningDate: employee.createdAt
        };
      }
    }
    
    const basicSalary = num(payload.basicSalary);
    
    let earnings = {
      basicSalary,
      da: num(payload.da),
      hra: num(payload.hra),
      conveyance: num(payload.conveyance),
      medicalallowances: num(payload.medicalallowances),
      specialallowances: num(payload.specialallowances)
    };
    
    // Auto-calculate HRA if enabled
    if (payload.autoCalculateHRA) {
      earnings.hra = (basicSalary * (num(payload.hraPercentage) || 40)) / 100;
    }
    
    // Calculate total earnings
    const totalEarnings = Object.values(earnings).reduce((sum, val) => sum + val, 0);
    
    // Auto-calculate deductions
    let deductions = {
      pf: num(payload.pf),
      proftax: num(payload.proftax),
      deductions: num(payload.deductions),
      lopamount: num(payload.lopamount)
    };
    
    // Auto-calculate PF if enabled
    if (payload.autoCalculatePF) {
      deductions.pf = (basicSalary * (num(payload.pfPercentage) || 12)) / 100;
    }
    
    // Auto-calculate LOP if enabled (based on total earnings)
    if (payload.autoCalculateLOP && payload.lopDays) {
      const dailySalary = totalEarnings / (num(payload.workingdays) || 30);
      deductions.lopamount = dailySalary * num(payload.lopDays);
    }
    
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    
    // Create salary record
    const newSalary = new Salary({
      employeeId: payload.employeeObjectId || payload.employeeId,
      name: employeeDetails?.name || payload.name,
      joiningDate: employeeDetails?.joiningDate || payload.joiningDate,
      designation: employeeDetails?.designation || payload.designation,
      department: employeeDetails?.department || payload.department,
      location: payload.location || "",
      pan: payload.pan || "",
      uan: payload.uan || "",
      workingdays: num(payload.workingdays) || 30,
      lopDays: num(payload.lopDays) || 0,
      bankname: payload.bankname || "",
      bankaccountnumber: payload.bankaccountnumber || "",
      month: payload.monthName || getMonthName(payload.month),
      year: Number(payload.year),
      ...earnings,
      ...deductions,
      netSalary: Number(netSalary.toFixed(2)),
      payDate: payload.payDate || new Date()
    });
    
    await newSalary.save();
    
    return res.status(200).json({ 
      success: true, 
      salary: newSalary,
      calculations: {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),

        netSalary: Number(netSalary.toFixed(2))
      }
    });
  } catch (error) {
    console.error("Generate Payslip error:", error);
    return res.status(500).json({ success: false, error: "Payslip generation server error" });
  }
};

// Calculate LOP (Loss of Pay) for an employee
export const calculateLOP = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    
    if (!employeeId || !month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: "Employee ID, month, and year are required" 
      });
    }
    
    // Find employee
    const employee = await Employee.findOne({ employeeId })
      .populate('userId', 'name')
      .populate('department', 'dep_name');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: "Employee not found" 
      });
    }
    
    // Calculate working days for the month
    const workingDays = getWorkingDaysInMonth(parseInt(year), parseInt(month) - 1);
    
    // For now, return mock LOP calculation
    // In a real implementation, you would fetch attendance data and calculate actual LOP
    const lopDays = 0; // This should be calculated based on attendance
    const lopAmount = 0; // This should be calculated based on daily salary and LOP days
    
    return res.status(200).json({
      success: true,
      data: {
        employeeId: employee.employeeId,
        name: employee.userId.name,
        month: parseInt(month),
        year: parseInt(year),
        workingDays,
        lopDays,
        lopAmount
      }
    });
  } catch (error) {
    console.error("Calculate LOP error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Server error calculating LOP" 
    });
  }
};

// Auto-generate payslips for all employees based on templates
export const autoGenerateMonthlyPayslips = async (req, res) => {
  try {
    const { month, year } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, error: "Month and year are required" });
    }
    
    // Get all active employees with default templates
    const templates = await PayrollTemplate.find({ 
      isDefault: true, 
      isActive: true 
    }).populate('employeeId');

    // Check if no default templates exist
    if (templates.length === 0) {
      // Get total templates for diagnostic info
      const totalTemplates = await PayrollTemplate.countDocuments({ isActive: true });
      const defaultTemplates = await PayrollTemplate.countDocuments({ isDefault: true, isActive: true });
      
      return res.status(400).json({ 
        success: false, 
        error: "No default payroll templates found",
        details: {
          message: "Auto-generation requires employees to have default payroll templates",
          totalActiveTemplates: totalTemplates,
          defaultActiveTemplates: defaultTemplates,
          solution: "Please create payroll templates for employees and set them as default, or update existing templates to be default"
        },
        generated: 0,
        results: [],
        errors: []
      });
    }

    const results = [];
    const errors = [];
    
    for (const template of templates) {
      try {
        // Check if payslip already exists for this month/year
        const existingPayslip = await Salary.findOne({
          employeeId: template.employeeId._id,
          month: getMonthName(month),
          year: Number(year)
        });
        
        if (existingPayslip) {
          errors.push({
            employeeId: template.employeeId.employeeId,
            error: "Payslip already exists for this month"
          });
          continue;
        }
        
        const workingDays = getWorkingDaysInMonth(year, month - 1);
        
        // Calculate earnings with auto-calculations
        let hra = template.hra;
        if (template.autoCalculateHRA) {
          hra = (template.basicSalary * template.hraPercentage) / 100;
        }
        
        let pf = template.pf;
        if (template.autoCalculatePF) {
          pf = (template.basicSalary * template.pfPercentage) / 100;
        }
        
        const totalEarnings = template.basicSalary + template.da + hra + 
                             template.conveyance + template.medicalallowances + 
                             template.specialallowances;
        
        const totalDeductions = pf + template.proftax + template.deductions + (template.lopamount || 0);
        const netSalary = Math.max(0, totalEarnings - totalDeductions);
        
        // Get employee details
        const employee = await Employee.findById(template.employeeId._id)
          .populate('userId', 'name')
          .populate('department', 'dep_name');
        
        // Check if employee is active
        if (employee.status !== 'active') {
          errors.push({
            employeeId: template.employeeId.employeeId,
            error: "Employee is not active - payslip generation skipped"
          });
          continue;
        }
        
        // Create payslip
        const newSalary = new Salary({
          employeeId: template.employeeId._id,
          name: employee.userId.name,
          joiningDate: employee.createdAt || new Date(), // Use employee creation date or current date
          designation: employee.designation,
          department: employee.department.dep_name,
          location: template.location,
          pan: template.pan,
          uan: template.uan,
          workingdays: workingDays,
          lopDays: template.lopDays || 0,
          bankname: template.bankname,
          bankaccountnumber: template.bankaccountnumber,
          month: getMonthName(month),
          year: Number(year),
          basicSalary: template.basicSalary,
          da: template.da,
          hra: Number(hra.toFixed(2)),
          conveyance: template.conveyance,
          medicalallowances: template.medicalallowances,
          specialallowances: template.specialallowances,
          proftax: template.proftax,
          pf: Number(pf.toFixed(2)),
          deductions: template.deductions,
          lopamount: template.lopamount || 0,
          netSalary: Number(netSalary.toFixed(2)),
          payDate: new Date()
        });
        
        await newSalary.save();
        results.push({
          employeeId: template.employeeId.employeeId,
          name: employee.userId.name,
          netSalary: netSalary,
          status: "Generated successfully"
        });
        
      } catch (error) {
        errors.push({
          employeeId: template.employeeId.employeeId,
          error: error.message
        });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      generated: results.length,
      results,
      errors
    });
  } catch (error) {
    console.error("Auto Generate Monthly Payslips error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Auto-generate payslips for selected employees
export const autoGenerateSelectedPayslips = async (req, res) => {
  try {
    const { month, year, selectedEmployees } = req.body;
    
    if (!month || !year || !selectedEmployees || !Array.isArray(selectedEmployees)) {
      return res.status(400).json({ success: false, error: "Month, year, and selectedEmployees array are required" });
    }

    if (selectedEmployees.length === 0) {
      return res.status(400).json({ success: false, error: "At least one employee must be selected" });
    }
    
    // Get templates for selected employees only
    const templates = await PayrollTemplate.find({ 
      employeeId: { $in: selectedEmployees },
      isDefault: true, 
      isActive: true 
    }).populate('employeeId');

    if (templates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No default payroll templates found for selected employees",
        details: {
          message: "Selected employees must have default payroll templates",
          solution: "Please create payroll templates for selected employees and set them as default"
        },
        generated: 0,
        results: [],
        errors: []
      });
    }

    const results = [];
    const errors = [];
    
    for (const template of templates) {
      try {
        // Check if employee is active
        if (template.employeeId.status !== 'active') {
          console.log(`Skipping payslip generation for inactive employee: ${template.employeeId.employeeId}`);
          continue;
        }

        // Check if payslip already exists
        const existingPayslip = await Salary.findOne({
          employeeId: template.employeeId._id,
          month: getMonthName(parseInt(month)), // Convert month number to month name
          year: parseInt(year)
        });
        
        if (existingPayslip) {
          errors.push({
            employeeId: template.employeeId.employeeId,
            error: "Payslip already exists for this month"
          });
          continue;
        }
        
        // Calculate working days for the selected month/year
        const workingDays = getWorkingDaysInMonth(year, month - 1);
        
        // Calculate earnings
        const basicSalary = num(template.basicSalary);
        const da = num(template.da);
        const hra = num(template.hra);
        const conveyance = num(template.conveyance);
        const medicalallowances = num(template.medicalallowances);
        const specialallowances = num(template.specialallowances);
        
        const totalEarnings = basicSalary + da + hra + conveyance + medicalallowances + specialallowances;
        
        // Calculate deductions
        const pf = num(template.pf);
        const proftax = num(template.proftax);
        const deductions = num(template.deductions);
        
        const totalDeductions = pf + proftax + deductions;
        const netSalary = Math.max(0, totalEarnings - totalDeductions);
        
        // Get employee details
        const employee = await Employee.findById(template.employeeId._id)
          .populate('userId', 'name')
          .populate('department', 'dep_name');
        
        // Create new salary record
        const newSalary = new Salary({
          employeeId: template.employeeId._id,
          name: employee.userId.name,
          joiningDate: employee.createdAt || new Date(), // Use employee creation date or current date
          designation: employee.designation,
          department: employee.department?.dep_name || 'N/A',
          month: getMonthName(parseInt(month)), // Convert month number to month name
          year: parseInt(year),
          
          // Working days calculation
          workingdays: workingDays,
          
          // Bank details from template
          bankname: template.bankname || '',
          bankaccountnumber: template.bankaccountnumber || '',
          
          // Identity details from template
          pan: template.pan || '',
          uan: template.uan || '',
          
          // Earnings
          basicSalary,
          da,
          hra,
          conveyance,
          medicalallowances,
          specialallowances,
          
          // Deductions
          pf,
          proftax,
          deductions,
          
          // Totals
          netSalary,
          
          // LOP fields (default to 0 for auto-generation)
          lopDays: 0,
          lopamount: 0,
          
          // Required fields
          payDate: new Date() // Current date as pay date
        });
        
        await newSalary.save();
        
        results.push({
          employeeId: template.employeeId.employeeId,
          name: employee.userId.name,
          netSalary,
          status: 'Generated successfully'
        });
        
      } catch (error) {
        console.error(`Error generating payslip for employee ${template.employeeId.employeeId}:`, error);
        errors.push({
          employeeId: template.employeeId.employeeId,
          error: error.message
        });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      generated: results.length,
      results,
      errors
    });
  } catch (error) {
    console.error("Auto Generate Selected Payslips error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Helper function to get month name
function getMonthName(monthNumber) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[monthNumber - 1] || "January";
}

// Get payslip history
export const getPayslipHistory = async (req, res) => {
  try {
    const { employeeId, page = 1, limit = 100 } = req.query;
    
    let query = {};
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        query.employeeId = employee._id;
      }
    }
    
    const payslips = await Salary.find(query)
      .populate({
        path: 'employeeId',
        select: 'employeeId designation',
        populate: {
          path: 'userId',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Transform data to match frontend expectations
    const transformedPayslips = payslips.map(payslip => {
      const totalDeductions = 
        (payslip.pf || 0) + 
        (payslip.proftax || 0) + 
        (payslip.deductions || 0) + 
        (payslip.lopamount || 0);
      
      // Convert month name to number for frontend compatibility
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthNumber = typeof payslip.month === 'string' 
        ? monthNames.indexOf(payslip.month) + 1 
        : parseInt(payslip.month) || new Date(payslip.createdAt).getMonth() + 1;
      
      return {
        _id: payslip._id,
        employeeId: payslip.employeeId?.employeeId || 'N/A',
        name: payslip.name || payslip.employeeId?.userId?.name || 'N/A',
        designation: payslip.designation || payslip.employeeId?.designation || 'N/A',
        department: payslip.department || 'N/A',
        month: monthNumber,
        monthName: typeof payslip.month === 'string' ? payslip.month : monthNames[monthNumber - 1],
        year: payslip.year || new Date(payslip.createdAt).getFullYear(),
        basicSalary: payslip.basicSalary || 0,
        lopDays: payslip.lopDays || 0,
        lopamount: payslip.lopamount || 0,
        totalDeductions: totalDeductions,
        netSalary: payslip.netSalary || 0,
        createdAt: payslip.createdAt,
        payDate: payslip.payDate || payslip.createdAt
      };
    });
    
    const total = await Salary.countDocuments(query);
    
    return res.status(200).json({ 
      success: true, 
      payslips: transformedPayslips,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Get Payslip History error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Download payslip PDF
export const downloadPayslipPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const salary = await Salary.findById(id).populate("employeeId", "employeeId name");
    
    if (!salary) {
      return res.status(404).json({ success: false, error: "Payslip not found" });
    }
    
    generateSalaryPDF(res, salary);
  } catch (error) {
    console.error("Download Payslip PDF error:", error);
    return res.status(500).json({ success: false, error: "PDF generation error" });
  }
};

// Test endpoint for working days calculation
export const testWorkingDays = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required"
      });
    }
    
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);
    
    // Calculate working days using our function
    const workingDays = getWorkingDaysInMonth(yearInt, monthInt - 1); // Convert to 0-indexed
    const daysInMonth = new Date(yearInt, monthInt, 0).getDate();
    
    // Manual verification for comparison
    let manualCount = 0;
    const dayBreakdown = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearInt, monthInt - 1, day);
      const dayOfWeek = date.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      const isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6;
      
      if (isWorkingDay) manualCount++;
      
      dayBreakdown.push({
        day,
        date: date.toISOString().split('T')[0],
        dayName,
        isWorkingDay
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        month: monthInt,
        year: yearInt,
        totalDays: daysInMonth,
        workingDaysCalculated: workingDays,
        workingDaysManual: manualCount,
        match: workingDays === manualCount,
        dayBreakdown
      }
    });
  } catch (error) {
    console.error("Test Working Days error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Fix existing payslips with incorrect working days
export const fixWorkingDaysInPayslips = async (req, res) => {
  try {
    // Get all payslips
    const payslips = await Salary.find({});
    
    let updatedCount = 0;
    const results = [];
    
    for (const payslip of payslips) {
      // Parse month name to month number
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      
      const monthIndex = monthNames.indexOf(payslip.month);
      if (monthIndex === -1) {
        results.push({
          payslipId: payslip._id,
          error: `Invalid month name: ${payslip.month}`
        });
        continue;
      }
      
      // Calculate correct working days
      const correctWorkingDays = getWorkingDaysInMonth(payslip.year, monthIndex);
      
      // Update if different
      if (payslip.workingdays !== correctWorkingDays) {
        await Salary.findByIdAndUpdate(payslip._id, {
          workingdays: correctWorkingDays
        });
        
        updatedCount++;
        results.push({
          payslipId: payslip._id,
          employeeId: payslip.employeeId,
          month: payslip.month,
          year: payslip.year,
          oldWorkingDays: payslip.workingdays,
          newWorkingDays: correctWorkingDays,
          updated: true
        });
      } else {
        results.push({
          payslipId: payslip._id,
          employeeId: payslip.employeeId,
          month: payslip.month,
          year: payslip.year,
          workingDays: payslip.workingdays,
          updated: false,
          message: "Already correct"
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Fixed working days for ${updatedCount} payslips`,
      totalPayslips: payslips.length,
      updatedCount,
      results
    });
  } catch (error) {
    console.error("Fix Working Days error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Preview payslip without saving to database
export const previewPayslip = async (req, res) => {
  try {
    const payload = req.body;
    
    // Auto-fetch employee details if employeeId is provided
    let employeeDetails = null;
    let employeeObjectId = payload.employeeObjectId || null;
    
    if (payload.employeeId && !payload.name) {
      const employee = await Employee.findOne({ employeeId: payload.employeeId })
        .populate('userId', 'name email')
        .populate('department', 'dep_name');
      
      if (employee) {
        employeeObjectId = employee._id;
        employeeDetails = {
          name: employee.userId.name,
          email: employee.userId.email,
          designation: employee.designation,
          department: employee.department.dep_name,
          joiningDate: employee.createdAt
        };
      }
    } else if (payload.employeeId && !employeeObjectId) {
      // Try to find employeeObjectId even if name is provided
      const employee = await Employee.findOne({ employeeId: payload.employeeId });
      if (employee) {
        employeeObjectId = employee._id;
      }
    }
    
    const basicSalary = num(payload.basicSalary);
    
    // Auto-calculate allowances if template is used
    let earnings = {
      basicSalary,
      da: num(payload.da),
      hra: num(payload.hra),
      conveyance: num(payload.conveyance),
      medicalallowances: num(payload.medicalallowances),
      specialallowances: num(payload.specialallowances)
    };
    
    // Auto-calculate HRA if enabled
    if (payload.autoCalculateHRA) {
      earnings.hra = (basicSalary * (num(payload.hraPercentage) || 40)) / 100;
    }
    
    // Calculate total earnings
    const totalEarnings = Object.values(earnings).reduce((sum, val) => sum + val, 0);
    
    // Auto-calculate deductions
    let deductions = {
      pf: num(payload.pf),
      proftax: num(payload.proftax),
      deductions: num(payload.deductions),
      lopamount: num(payload.lopamount)
    };
    
    // Auto-calculate PF if enabled
    if (payload.autoCalculatePF) {
      deductions.pf = (basicSalary * (num(payload.pfPercentage) || 12)) / 100;
    }
    
    // Calculate total deductions
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    
    // Calculate net salary
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    
    // Create preview payslip object (not saved to database)
    const previewPayslip = {
      employeeId: payload.employeeId,
      employeeObjectId: employeeObjectId,
      name: employeeDetails?.name || payload.name,
      email: employeeDetails?.email,
      joiningDate: employeeDetails?.joiningDate || payload.joiningDate,
      designation: employeeDetails?.designation || payload.designation,
      department: employeeDetails?.department || payload.department,
      location: payload.location,
      workingdays: payload.workingdays,
      lopDays: payload.lopDays || 0,
      bankname: payload.bankname,
      bankaccountnumber: payload.bankaccountnumber,
      pan: payload.pan,
      uan: payload.uan,
      month: payload.monthName || getMonthName(payload.month),
      year: payload.year,
      basicSalary: earnings.basicSalary,
      da: earnings.da,
      hra: earnings.hra,
      conveyance: earnings.conveyance,
      medicalallowances: earnings.medicalallowances,
      specialallowances: earnings.specialallowances,
      pf: deductions.pf,
      proftax: deductions.proftax,
      deductions: deductions.deductions,
      lopamount: deductions.lopamount,
      totalEarnings,
      totalDeductions,
      netSalary,
      payDate: payload.payDate || new Date()
    };
    
    return res.status(200).json({ 
      success: true, 
      payslip: previewPayslip,
      message: "Payslip preview generated successfully"
    });
  } catch (error) {
    console.error("Preview Payslip error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Send payslip via email
export const sendPayslipEmail = async (req, res) => {
  try {
    const { payslipId, employeeEmail, customMessage, payslipData } = req.body;
    
    if (!payslipId && !employeeEmail && !payslipData) {
      return res.status(400).json({ success: false, error: "Payslip ID, employee email, or payslip data is required" });
    }
    
    let payslip;
    let employeeDetails;
    
    if (payslipId) {
      // Get existing payslip from database
      payslip = await Salary.findById(payslipId).populate('employeeId');
      if (!payslip) {
        return res.status(404).json({ success: false, error: "Payslip not found" });
      }
      
      // Get employee email
      const employee = await Employee.findById(payslip.employeeId)
        .populate('userId', 'email');
      employeeDetails = {
        email: employee?.userId?.email,
        name: payslip.name
      };
    } else if (payslipData) {
      // Handle payslip data from frontend (preview mode)
      payslip = payslipData;
      
      // Get employee email using employeeObjectId
      if (payslip.employeeObjectId) {
        const employee = await Employee.findById(payslip.employeeObjectId)
          .populate('userId', 'email name');
        
        if (employee && employee.userId) {
          employeeDetails = {
            email: employee.userId.email,
            name: employee.userId.name || payslip.name
          };
        } else {
          return res.status(404).json({ success: false, error: "Employee not found or email not available" });
        }
      } else {
        return res.status(400).json({ success: false, error: "Employee ID is required in payslip data" });
      }
    } else {
      // Use provided payslip data and email
      payslip = req.body.payslip;
      employeeDetails = {
        email: employeeEmail,
        name: payslip.name
      };
    }
    
    if (!employeeDetails.email) {
      return res.status(400).json({ success: false, error: "Employee email not found" });
    }
    
    // Create email content
    const subject = `Payslip for ${payslip.month} ${payslip.year} - ${payslip.name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2563eb; margin: 0;">SPESHWAY SOLUTIONS PRIVATE LIMITED</h2>
          <p style="color: #666; margin: 5px 0;">Plot No 1/C, Sy No 83/1, Raidurgam Knowledge City Rd, panmaktha Hyderabad, Serilingampalle (M), Rai Durg, Telangana 500032</p>
          <h3 style="color: #1f2937; margin: 20px 0;">Payslip for ${payslip.month} ${payslip.year}</h3>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="color: #374151; margin: 0 0 15px 0;">Employee Details</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>Name:</strong> ${payslip.name}</div>
            <div><strong>Employee ID:</strong> ${payslip.employeeId}</div>
            <div><strong>Designation:</strong> ${payslip.designation || 'N/A'}</div>
            <div><strong>Department:</strong> ${payslip.department || 'N/A'}</div>
            <div><strong>Working Days:</strong> ${payslip.workingdays || 0}</div>
            <div><strong>LOP Days:</strong> ${payslip.lopDays || 0}</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px;">
            <h4 style="color: #065f46; margin: 0 0 10px 0;">Earnings</h4>
            <div style="font-size: 14px; line-height: 1.6;">
              <div>Basic Salary: ₹${payslip.basicSalary || 0}</div>
              <div>DA: ₹${payslip.da || 0}</div>
              <div>HRA: ₹${payslip.hra || 0}</div>
              <div>Conveyance: ₹${payslip.conveyance || 0}</div>
              <div>Medical Allowances: ₹${payslip.medicalallowances || 0}</div>
              <div>Special Allowances: ₹${payslip.specialallowances || 0}</div>
              
              <div style="border-top: 1px solid #065f46; margin-top: 8px; padding-top: 8px; font-weight: bold;">
                Total Earnings: ₹${payslip.totalEarnings || (Number(payslip.basicSalary || 0) + Number(payslip.da || 0) + Number(payslip.hra || 0) + Number(payslip.conveyance || 0) + Number(payslip.medicalallowances || 0) + Number(payslip.specialallowances || 0))}
              </div>
            </div>
          </div>
          
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px;">
            <h4 style="color: #991b1b; margin: 0 0 10px 0;">Deductions</h4>
            <div style="font-size: 14px; line-height: 1.6;">
              <div>PF: ₹${payslip.pf || 0}</div>
              <div>Professional Tax: ₹${payslip.proftax || 0}</div>
              <div>Other Deductions: ₹${payslip.deductions || 0}</div>
              <div>LOP Amount: ₹${payslip.lopamount || 0}</div>
              <div style="border-top: 1px solid #991b1b; margin-top: 8px; padding-top: 8px; font-weight: bold;">
                Total Deductions: ₹${payslip.totalDeductions || (Number(payslip.pf || 0) + Number(payslip.proftax || 0) + Number(payslip.deductions || 0) + Number(payslip.lopamount || 0))}
              </div>
            </div>
          </div>
        </div>
        
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <h3 style="color: #1e40af; margin: 0;">Net Salary: ₹${payslip.netSalary || 0}</h3>
        </div>
        
        ${customMessage ? `<div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;"><p style="margin: 0; color: #374151;">${customMessage}</p></div>` : ''}
        
        <div style="text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p>This is a system-generated payslip. For any queries, please contact HR department.</p>
          <p>© ${new Date().getFullYear()} SPESHWAY SOLUTIONS PRIVATE LIMITED. All rights reserved.</p>
        </div>
      </div>
    `;
    
    // Ensure payslip data structure is correct for PDF generation
    const pdfPayslipData = {
      ...payslip,
      // Ensure employeeId is in the correct format for PDF generator
      employeeId: payslip.employeeId || payslip.employeeObjectId,
      // Ensure all required fields are present with default values
      basicSalary: payslip.basicSalary || 0,
      da: payslip.da || 0,
      hra: payslip.hra || 0,
      conveyance: payslip.conveyance || 0,
      medicalallowances: payslip.medicalallowances || 0,
      specialallowances: payslip.specialallowances || 0,
      proftax: payslip.proftax || 0,
      pf: payslip.pf || 0,
      deductions: payslip.deductions || 0,
      lopamount: payslip.lopamount || 0,
      workingdays: payslip.workingdays || 0,
      lopDays: payslip.lopDays || 0,
      netSalary: payslip.netSalary || 0,
      month: payslip.month || '',
      year: payslip.year || new Date().getFullYear(),
      name: payslip.name || '',
      joiningDate: payslip.joiningDate || new Date(),
      designation: payslip.designation || '',
      department: payslip.department || '',
      bankname: payslip.bankname || '',
      bankaccountnumber: payslip.bankaccountnumber || '',
      pan: payslip.pan || '',
      uan: payslip.uan || ''
    };
    
    console.log('PDF Payslip Data:', JSON.stringify(pdfPayslipData, null, 2));
    
    // Generate PDF buffer for attachment
    let pdfBuffer;
    try {
      console.log('About to generate PDF with data:', JSON.stringify(pdfPayslipData, null, 2));
      pdfBuffer = await generateSalaryPDFBuffer(pdfPayslipData);
      console.log('PDF generation successful');
      console.log('PDF buffer type:', typeof pdfBuffer);
      console.log('PDF buffer is Buffer?', Buffer.isBuffer(pdfBuffer));
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      return res.status(500).json({ success: false, error: "Failed to generate PDF: " + pdfError.message });
    }
    
    // Check if PDF buffer was generated successfully
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('PDF buffer is empty or null');
      return res.status(500).json({ success: false, error: "Failed to generate PDF attachment" });
    }
    
    console.log('PDF Buffer size:', pdfBuffer.length, 'bytes');
    
    // Prepare email attachment
    const employeeIdForFilename = pdfPayslipData?.employeeId || 'Unknown';
    const attachments = [
      {
        filename: `Payslip_${employeeIdForFilename}_${pdfPayslipData.month}_${pdfPayslipData.year}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
    
    console.log('Attachment details:', {
      filename: attachments[0].filename,
      contentSize: attachments[0].content.length,
      contentType: attachments[0].contentType
    });
    
    // Send email with PDF attachment
    await sendEmail(employeeDetails.email, subject, htmlContent, attachments);
    
    return res.status(200).json({ 
      success: true, 
      message: `Payslip sent successfully to ${employeeDetails.email}`,
      sentTo: employeeDetails.email
    });
  } catch (error) {
    console.error("Send Payslip Email error:", error);
    return res.status(500).json({ success: false, error: "Failed to send email" });
  }
};

// Download PDF from preview data
export const downloadPreviewPDF = async (req, res) => {
  try {
    const { payslipData } = req.body;
    
    if (!payslipData) {
      return res.status(400).json({ success: false, error: "Payslip data is required" });
    }
    
    // Generate PDF using the same function as regular payslips
    await generateSalaryPDF(res, payslipData);
  } catch (error) {
    console.error("Download Preview PDF error:", error);
    return res.status(500).json({ success: false, error: "Failed to generate PDF" });
  }
};
