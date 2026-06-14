import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import PayrollTemplate from "../models/PayrollTemplate.js";
import Salary from "../models/Salary.js";
import Candidate from "../models/Candidate.js";
import Offer from "../models/Offer.js";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";
import { enqueueEmail } from "../utils/emailQueue.js";

const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      employeeId,
      dob,
      joiningDate,
      gender,
      mobilenumber,
      designation,
      department,
      password,
      role,
    } = req.body;
 
    // Check if user exists
    const existingUser = await User.findOne({ email });
    let savedUser;

    if (existingUser) {
      const existingEmployee = await Employee.findOne({ userId: existingUser._id });
      if (existingEmployee) {
        return res
          .status(400)
          .json({ success: false, error: "User already exists" });
      }
      // Reuse existing user (Zombie user cleanup)
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser.name = name;
      existingUser.password = hashedPassword;
      existingUser.role = role;
      savedUser = await existingUser.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
      });
      savedUser = await newUser.save();
    }

    // Save employee
    const newEmployee = new Employee({
      userId: savedUser._id,
      employeeId,
      dob,
      joiningDate,
      gender,
      mobilenumber,
      designation,
      department,
    });

    try {
      await newEmployee.save();
    } catch (err) {
      // If we created a new user, delete it to prevent zombie users
      if (!existingUser) {
        await User.findByIdAndDelete(savedUser._id);
      }
      throw err;
    }
 
    const emailHtml = `
      <h2>Welcome to Speshway Solutions 🎉</h2>
      <p>Dear <b>${name}</b>,</p>
      <p>On behalf of the entire team, we are delighted to welcome you to Speshway Solutions. We are excited to have you join us as <b>${designation}</b> and look forward to your contributions towards our collective success.</p>
      
      <div class="credentials-card">
        <h4>Your HRMS & Email Portal Credentials</h4>
        <p style="margin-bottom: 8px;"><strong>Username (Email):</strong> <code>${email}</code></p>
        <p style="margin-bottom: 12px;"><strong>Temporary Password:</strong> <code>${password}</code></p>
        <p style="font-size: 13px; color: #64748b;">Use these credentials to log in to both your HRMS portal and your official company webmail account.</p>
      </div>

      <div style="margin: 25px 0;">
        <h4 style="color: #0f172a; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Portal Quick Links</h4>
        <p style="margin-bottom: 15px;">
          <a href="https://www.speshwayhrms.com/" class="btn-action">Login to HRMS Portal</a>
          <span style="display: block; font-size: 12px; color: #64748b; margin-top: 4px;">Or navigate to: https://www.speshwayhrms.com/</span>
        </p>
        <p>
          <a href="https://webmail.speshway.com/" class="btn-action" style="background-color: #0f766e !important; box-shadow: 0 4px 6px -1px rgba(15, 118, 110, 0.2) !important;">Open Company Webmail</a>
          <span style="display: block; font-size: 12px; color: #64748b; margin-top: 4px;">Or navigate to: https://webmail.speshway.com/</span>
        </p>
      </div>

      <p>We believe your unique skills, experience, and talent will be a great addition to our growing team. We are committed to supporting your professional journey and building a bright future together.</p>
      
      <p>Once again, welcome aboard!</p>
      
      <p>Best regards,<br/>
      <strong>HR Operations Team</strong><br/>
      Speshway Solutions Pvt. Ltd.</p>
    `;

    enqueueEmail(email, "Welcome to Speshway Solutions 🎉", emailHtml);
 
    return res
      .status(200)
      .json({ success: true, message: "Employee created & Welcome email sent" });
  } catch (error) {
    console.error("Add employee error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Server error in adding employee" });
  }
};
 
// Get all employees
const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate("userId", { password: 0 })
      .populate("department");
    return res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Get employees server error" });
  }
};
 
// Get single employee
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    let employee = await Employee.findById(id)
      .populate("userId", { password: 0 })
      .populate("department");
 
    if (!employee) {
      employee = await Employee.findOne({ userId: id })
        .populate("userId", { password: 0 })
        .populate("department");
    }
 
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, error: "Employee not found" });
    }

    // Get default payroll template or any template
    let template = await PayrollTemplate.findOne({ 
      employeeId: employee._id, 
      isDefault: true, 
      isActive: true 
    });
    if (!template) {
      template = await PayrollTemplate.findOne({ 
        employeeId: employee._id, 
        isActive: true 
      });
    }

    // Get last salary record (payslip) for bank account, pan, uan
    const lastSalary = await Salary.findOne({ employeeId: employee._id }).sort({ createdAt: -1 });

    // Look up Candidate and Offer details from onboarding process
    let candidate = null;
    let offer = null;
    if (employee.userId) {
      candidate = await Candidate.findOne({ userId: employee.userId._id || employee.userId });
      if (candidate) {
        offer = await Offer.findOne({ candidateId: candidate._id });
      }
    }

    const bankname = template?.bankname || lastSalary?.bankname || candidate?.bankDetails?.bankName || "";
    const bankaccountnumber = template?.bankaccountnumber || lastSalary?.bankaccountnumber || candidate?.bankDetails?.accountNumber || "";
    const pan = template?.pan || lastSalary?.pan || "";
    const uan = template?.uan || lastSalary?.uan || "";
    const location = template?.location || lastSalary?.location || offer?.workLocation || "Hyderabad";
    
    // Calculate fullSalary (prioritizing Template -> Salary -> Offer divided by 12)
    let fullSalary = "";
    if (template) {
      fullSalary = (
        (template.basicSalary || 0) +
        (template.da || 0) +
        (template.hra || 0) +
        (template.conveyance || 0) +
        (template.medicalallowances || 0) +
        (template.specialallowances || 0)
      );
    } else if (lastSalary) {
      fullSalary = (
        (lastSalary.basicSalary || 0) +
        (lastSalary.da || 0) +
        (lastSalary.hra || 0) +
        (lastSalary.conveyance || 0) +
        (lastSalary.medicalallowances || 0) +
        (lastSalary.specialallowances || 0)
      );
    } else if (offer && offer.salaryPackage) {
      fullSalary = parseFloat((offer.salaryPackage / 12).toFixed(2));
    }

    let pf = template?.pf || lastSalary?.pf || 0;
    if ((pf === 0 || pf === null || pf === undefined) && fullSalary > 0) {
      let basicSalary = 0;
      const fSal = parseFloat(fullSalary);
      if (fSal > 2850) {
        const remaining = fSal - 2850;
        basicSalary = parseFloat((remaining * 0.40).toFixed(2));
      } else {
        basicSalary = fSal;
      }
      pf = Math.round(basicSalary * 0.24);
    }

    const employeeObj = employee.toObject();
    employeeObj.bankname = bankname;
    employeeObj.bankaccountnumber = bankaccountnumber;
    employeeObj.pan = pan;
    employeeObj.uan = uan;
    employeeObj.location = location;
    employeeObj.fullSalary = fullSalary;
    employeeObj.pf = pf;
 
    return res.status(200).json({ success: true, employee: employeeObj });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Get employee server error" });
  }
};
 
// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      employeeId,
      dob,
      gender,
      mobilenumber,
      designation,
      department,
      role,
      salary,
      joiningDate,
      bankname,
      bankaccountnumber,
      pan,
      uan,
      location,
      pf,
    } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, error: "Employee not found" });
    }

    const user = await User.findById(employee.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (employeeId && employeeId !== employee.employeeId) {
      const existingEmployee = await Employee.findOne({ employeeId });
      if (existingEmployee && existingEmployee._id.toString() !== id) {
        return res.status(400).json({
          success: false,
          error: "Employee ID already in use",
        });
      }
    }

    const updatedUserData = { name, email };
    if (role) {
      updatedUserData.role = role;
      console.log("Updating role to:", role);
    }
    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      updatedUserData.password = hashedPassword;
      console.log("Updating password");
    }
    console.log("Updated User Data:", updatedUserData);
    const updatedUserResult = await User.findByIdAndUpdate(
      user._id,
      updatedUserData,
      { new: true }
    );

    const employeeUpdateData = {
      mobilenumber,
      designation,
      salary,
      department,
      gender,
      dob,
      joiningDate,
      updatedAt: new Date(),
    };

    if (employeeId) {
      employeeUpdateData.employeeId = employeeId;
    }

    await Employee.findByIdAndUpdate(id, employeeUpdateData);

    // Update or create default PayrollTemplate with bank details, location, PAN, UAN, and salary
    try {
      let template = await PayrollTemplate.findOne({ employeeId: id, isDefault: true });
      if (!template) {
        template = await PayrollTemplate.findOne({ employeeId: id });
      }

      // If salary/CTC changed, recalculate breakdown, otherwise keep existing values
      let salaryFields = {};
      if (salary !== undefined && salary !== null && salary !== "") {
        const fullSalary = parseFloat(salary);
        if (!isNaN(fullSalary)) {
          let basicSalary = 0;
          let da = 0;
          let hra = 0;
          let conveyance = 0;
          let medicalallowances = 0;
          let specialallowances = 0;
          
          if (fullSalary > 2850) {
            const remaining = fullSalary - 2850;
            basicSalary = parseFloat((remaining * 0.40).toFixed(2));
            da = parseFloat((remaining * 0.22).toFixed(2));
            hra = parseFloat((remaining * 0.20).toFixed(2));
            conveyance = 1600;
            medicalallowances = 1250;
            specialallowances = parseFloat((remaining * 0.18).toFixed(2));
          } else {
            basicSalary = parseFloat(fullSalary.toFixed(2));
          }

          salaryFields = {
            basicSalary,
            da,
            hra,
            conveyance,
            medicalallowances,
            specialallowances,
            proftax: fullSalary <= 20000 ? 150 : 200,
            pf: Math.round(basicSalary * 0.24),
            autoCalculatePF: true,
            pfPercentage: 24
          };
        }
      }

      if (template) {
        // Update existing template
        await PayrollTemplate.findByIdAndUpdate(template._id, {
          name: name || template.name,
          designation: designation || template.designation,
          bankname: bankname !== undefined ? bankname : template.bankname,
          bankaccountnumber: bankaccountnumber !== undefined ? bankaccountnumber : template.bankaccountnumber,
          pan: pan !== undefined ? pan : template.pan,
          uan: uan !== undefined ? uan : template.uan,
          location: location !== undefined ? location : template.location,
          joiningDate: joiningDate ? new Date(joiningDate) : template.joiningDate,
          ...salaryFields,
          pf: pf !== undefined ? (parseFloat(pf) || 0) : (salaryFields.pf !== undefined ? salaryFields.pf : template.pf),
          updatedAt: new Date()
        });
      } else {
        // Create a new default template if none existed yet
        const depModel = await Department.findById(department);
        const depName = depModel ? depModel.dep_name : "";
        
        const fullSalary = parseFloat(salary) || 0;
        let basicSalary = 0;
        let da = 0;
        let hra = 0;
        let conveyance = 0;
        let medicalallowances = 0;
        let specialallowances = 0;
        
        if (fullSalary > 2850) {
          const remaining = fullSalary - 2850;
          basicSalary = parseFloat((remaining * 0.40).toFixed(2));
          da = parseFloat((remaining * 0.22).toFixed(2));
          hra = parseFloat((remaining * 0.20).toFixed(2));
          conveyance = 1600;
          medicalallowances = 1250;
          specialallowances = parseFloat((remaining * 0.18).toFixed(2));
        } else {
          basicSalary = parseFloat(fullSalary.toFixed(2));
        }

        const newTemplate = new PayrollTemplate({
          employeeId: id,
          templateName: `${name} - Default Template`,
          name: name,
          designation: designation || "",
          department: depName,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          location: location || "Hyderabad",
          bankname: bankname || "",
          bankaccountnumber: bankaccountnumber || "",
          pan: pan || "",
          uan: uan || "",
          basicSalary,
          da,
          hra,
          conveyance,
          medicalallowances,
          specialallowances,
          proftax: fullSalary <= 20000 ? 150 : 200,
          pf: pf !== undefined ? (parseFloat(pf) || 0) : Math.round(basicSalary * 0.24),
          autoCalculatePF: true,
          pfPercentage: 24,
          deductions: 0,
          isActive: true,
          isDefault: true
        });
        await newTemplate.save();
      }
    } catch (templateError) {
      console.error("Error updating/creating payroll template in updateEmployee:", templateError);
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated",
      updatedUser: updatedUserResult,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Update employee server error" });
  }
};
 
// Get employees by department
const fetchEmployeesByDepId = async (req, res) => {
  try {
    const { id } = req.params;
    const employees = await Employee.find({ department: id });
    return res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Get employees by department server error",
    });
  }
};
 
// Get employee by ID or Name for auto-fetch
const getEmployeeByIdOrName = async (req, res) => {
  try {
    const { employeeId, employeeName } = req.query;
   
    if (!employeeId && !employeeName) {
      return res.status(400).json({ success: false, error: "Either employeeId or employeeName is required" });
    }
 
    let employee;
    if (employeeId) {
      employee = await Employee.findOne({ employeeId }).populate('userId', 'name');
    } else if (employeeName) {
      const user = await User.findOne({ name: { $regex: new RegExp(employeeName, 'i') } });
      if (user) {
        employee = await Employee.findOne({ userId: user._id }).populate('userId', 'name');
      }
    }
 
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }
 
    return res.status(200).json({
      success: true,
      employee: {
        employeeId: employee.employeeId,
        name: employee.userId.name
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
 
// Update employee status
const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: "Status must be either 'active' or 'inactive'" 
      });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: "Employee not found" 
      });
    }

    await Employee.findByIdAndUpdate(id, { 
      status, 
      updatedAt: new Date() 
    });

    return res.status(200).json({ 
      success: true, 
      message: `Employee status updated to ${status}` 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false, 
      error: "Update employee status server error" 
    });
  }
};

const importEmployeesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res
        .status(400)
        .json({ success: false, error: "No worksheet found in file" });
    }

    const headerRow = worksheet.getRow(1);
    const headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
      if (cell && cell.value) {
        const key = cell.value
          .toString()
          .toLowerCase()
          .replace(/\s+/g, "")
          .trim();
        if (key) {
          headerMap[key] = colNumber;
        }
      }
    });

    const requiredHeaders = ["name", "email", "employeeid", "department"];
    const missingHeaders = requiredHeaders.filter(
      (h) => !headerMap[h]
    );
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required columns: ${missingHeaders.join(", ")}`,
      });
    }

    const createdEmployees = [];
    const skipped = [];

    const getCellString = (row, key) => {
      const col = headerMap[key];
      if (!col) return "";
      const cell = row.getCell(col);
      if (!cell || cell.value == null) return "";
      if (cell.type === ExcelJS.ValueType.RichText && cell.value.richText) {
        return cell.value.richText.map((p) => p.text).join("").trim();
      }
      if (cell.value instanceof Date) {
        return cell.value.toISOString();
      }
      return cell.text ? cell.text.toString().trim() : cell.value.toString().trim();
    };

    const getCellDate = (row, key) => {
      const col = headerMap[key];
      if (!col) return undefined;
      const cell = row.getCell(col);
      if (!cell || cell.value == null) return undefined;
      if (cell.value instanceof Date) {
        return cell.value;
      }
      const raw = cell.text
        ? cell.text.toString().trim()
        : cell.value.toString().trim();
      if (!raw) return undefined;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return undefined;
      return d;
    };

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const email = getCellString(row, "email");
      const employeeId = getCellString(row, "employeeid");

      if (!email && !employeeId) {
        continue;
      }

      try {
        if (!email) {
          skipped.push({
            row: rowNumber,
            reason: "Missing email",
          });
          continue;
        }

        if (!employeeId) {
          skipped.push({
            row: rowNumber,
            reason: "Missing employeeId",
          });
          continue;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
          skipped.push({
            row: rowNumber,
            reason: "User with this email already exists",
          });
          continue;
        }

        const existingEmployee = await Employee.findOne({ employeeId });
        if (existingEmployee) {
          skipped.push({
            row: rowNumber,
            reason: "Employee with this employeeId already exists",
          });
          continue;
        }

        const departmentName = getCellString(row, "department");
        const department = await Department.findOne({
          dep_name: departmentName,
        });
        if (!department) {
          skipped.push({
            row: rowNumber,
            reason: `Department not found: ${departmentName}`,
          });
          continue;
        }

        const name = getCellString(row, "name");
        const dob = getCellDate(row, "dob");
        const joiningDate = getCellDate(row, "joiningdate");
        const gender = getCellString(row, "gender");
        const mobilenumber = getCellString(row, "mobilenumber");
        const designation = getCellString(row, "designation");
        const role =
          getCellString(row, "role") ||
          "employee";
        let rawPassword = getCellString(row, "password");
        if (!rawPassword) {
          const emailPrefix = (email || "").split("@")[0];
          rawPassword = emailPrefix ? `${emailPrefix}@123` : "Password@123";
        }

        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const newUser = new User({
          name,
          email,
          password: hashedPassword,
          role,
        });
        const savedUser = await newUser.save();

        const newEmployee = new Employee({
          userId: savedUser._id,
          employeeId,
          dob,
          joiningDate,
          gender,
          mobilenumber,
          designation,
          department: department._id,
        });
        await newEmployee.save();

        const emailHtml = `
      <h2>Welcome to Speshway Solutions 🎉</h2>
      <p>Dear <b>${name}</b>,</p>
      <p>On behalf of the entire team, we are delighted to welcome you to Speshway Solutions. We are excited to have you join us as <b>${designation}</b> and look forward to your contributions towards our collective success.</p>
      
      <div class="credentials-card">
        <h4>Your HRMS & Email Portal Credentials</h4>
        <p style="margin-bottom: 8px;"><strong>Username (Email):</strong> <code>${email}</code></p>
        <p style="margin-bottom: 12px;"><strong>Temporary Password:</strong> <code>${rawPassword}</code></p>
        <p style="font-size: 13px; color: #64748b;">Use these credentials to log in to both your HRMS portal and your official company webmail account.</p>
      </div>

      <div style="margin: 25px 0;">
        <h4 style="color: #0f172a; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Portal Quick Links</h4>
        <p style="margin-bottom: 15px;">
          <a href="https://www.speshwayhrms.com/" class="btn-action">Login to HRMS Portal</a>
          <span style="display: block; font-size: 12px; color: #64748b; margin-top: 4px;">Or navigate to: https://www.speshwayhrms.com/</span>
        </p>
        <p>
          <a href="https://webmail.speshway.com/" class="btn-action" style="background-color: #0f766e !important; box-shadow: 0 4px 6px -1px rgba(15, 118, 110, 0.2) !important;">Open Company Webmail</a>
          <span style="display: block; font-size: 12px; color: #64748b; margin-top: 4px;">Or navigate to: https://webmail.speshway.com/</span>
        </p>
      </div>

      <p>We believe your unique skills, experience, and talent will be a great addition to our growing team. We are committed to supporting your professional journey and building a bright future together.</p>
      
      <p>Once again, welcome aboard!</p>
      
      <p>Best regards,<br/>
      <strong>HR Operations Team</strong><br/>
      Speshway Solutions Pvt. Ltd.</p>
    `;

        enqueueEmail(email, "Welcome to Speshway Solutions 🎉", emailHtml);

        createdEmployees.push({
          row: rowNumber,
          employeeId,
          email,
        });
      } catch (rowError) {
        skipped.push({
          row: rowNumber,
          reason: rowError.message || "Unknown error",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Excel import processed",
      createdCount: createdEmployees.length,
      skippedCount: skipped.length,
      createdEmployees,
      skipped,
    });
  } catch (error) {
    console.error("Import employees from Excel error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error in importing employees from Excel",
    });
  }
};

const exportEmployeesToExcel = async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate("userId", "name email role")
      .populate("department", "dep_name");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Employees");

    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "EmployeeId", key: "employeeId", width: 20 },
      { header: "Department", key: "department", width: 25 },
      { header: "Dob", key: "dob", width: 15 },
      { header: "JoiningDate", key: "joiningDate", width: 15 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "MobileNumber", key: "mobilenumber", width: 18 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Role", key: "role", width: 15 },
      { header: "Password", key: "password", width: 18 },
    ];

    employees.forEach((emp) => {
      worksheet.addRow({
        name: emp.userId?.name || "",
        email: emp.userId?.email || "",
        employeeId: emp.employeeId || "",
        department: emp.department?.dep_name || "",
        dob: emp.dob ? emp.dob.toISOString().split("T")[0] : "",
        joiningDate: emp.joiningDate
          ? emp.joiningDate.toISOString().split("T")[0]
          : "",
        gender: emp.gender || "",
        mobilenumber: emp.mobilenumber || "",
        designation: emp.designation || "",
        role: emp.userId?.role || "",
        password: "",
      });
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="employees_template.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export employees to Excel error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error in exporting employees to Excel",
    });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    const userId = employee.userId;

    // Delete Employee
    await Employee.findByIdAndDelete(id);

    // Delete User
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    return res.status(200).json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Delete employee error:", error);
    return res.status(500).json({ success: false, error: "Server error in deleting employee" });
  }
};

export {
  addEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  updateEmployeeStatus,
  fetchEmployeesByDepId,
  getEmployeeByIdOrName,
  deleteEmployee,
  importEmployeesFromExcel,
  exportEmployeesToExcel
};
