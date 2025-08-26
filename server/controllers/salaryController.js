// backend/controllers/salaryController.js
import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";
import { generateSalaryPDF } from "../utils/pdfGenerator.js";

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};



export const getSalary = async (req, res) => {
  try {
    const { id, role } = req.params;

    let salary = [];
    if (role === "admin") {
      // Admin can fetch salaries by employeeId (id = employeeId)
      // First try to find by ObjectId, then by employeeId string
      try {
        salary = await Salary.find({ employeeId: id }).populate("employeeId", "employeeId name");
        
        // If no results and id is not a valid ObjectId, try finding by employeeId string
        if (salary.length === 0) {
          const employee = await Employee.findOne({ employeeId: id });
          if (employee) {
            salary = await Salary.find({ employeeId: employee._id }).populate("employeeId", "employeeId name");
          }
          // If employee not found, just return empty array instead of error
        }
      } catch (err) {
        // If ObjectId is invalid, try finding by employeeId string
        const employee = await Employee.findOne({ employeeId: id });
        if (employee) {
          salary = await Salary.find({ employeeId: employee._id }).populate("employeeId", "employeeId name");
        }
        // If employee not found, salary remains empty array
      }
    } else {
      // For employee/user: id is userId, map to employee._id
      const employee = await Employee.findOne({ userId: id });
      if (employee) {
        salary = await Salary.find({ employeeId: employee._id }).populate("employeeId", "employeeId name");
      }
      // If employee not found, salary remains empty array
    }

    return res.status(200).json({ success: true, salary });
  } catch (error) {
    console.error("Get Salary error:", error);
    return res.status(500).json({ success: false, error: "Salary get server error" });
  }
};

export const downloadSalaryPDF = async (req, res) => {
  try {
    const { id } = req.params; // Salary document _id
    const salary = await Salary.findById(id).populate("employeeId", "employeeId name");
    if (!salary) {
      return res.status(404).json({ success: false, error: "Salary record not found" });
    }
    generateSalaryPDF(res, salary);
  } catch (error) {
    console.error("Download Salary PDF error:", error);
    return res.status(500).json({ success: false, error: "Failed to generate PDF" });
  }
};

export const deleteSalary = async (req, res) => {
  try {
    const { id } = req.params; // Salary document _id
    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({ success: false, error: "Salary record not found" });
    }
    
    await Salary.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Salary record deleted successfully" });
  } catch (error) {
    console.error("Delete Salary error:", error);
    return res.status(500).json({ success: false, error: "Failed to delete salary record" });
  }
};
