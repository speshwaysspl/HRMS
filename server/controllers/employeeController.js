import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
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
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "User already exists" });
    }
 
    const hashedPassword = await bcrypt.hash(password, 10);
 
    // Save user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });
    const savedUser = await newUser.save();
 
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
 
    await newEmployee.save();
 
    const emailHtml = `
      <h2>Welcome to the SPESHWAY SOLUTION PVT LTD 🎉</h2>
      <p>Dear <b>${name}</b>,</p>
      <p>We are delighted to welcome you to Speshway Solution Pvt Ltd. We are excited to have you onboard as <b>${designation}</b> and look forward to working together towards achieving great success.
      </p>
      <p>Your login credentials are:</p>
      <p>Email: <b>${email}</b></p>
      <p>Password: <b>${password}</b></p>
      <p>Use the same credentials to log in to both the HRMS portal (attendance, payslip, leaves, and more) and your official company email (Webmail).</p>
      
      <p>You can login to the system using the following link:</p>
      <p><a href="https://www.speshwayhrms.com/" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Login to SPESHWAY HRMS</a></p>
      <p>Or copy and paste this URL in your browser: <b>https://www.speshwayhrms.com/</b></p>

      <p>Access your official company webmail:</p>
      <p><a href="https://webmail.speshway.com/" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Open Webmail</a></p>
      <p>Or copy and paste this URL in your browser: <b>https://webmail.speshway.com/</b></p>

      <p>
We believe your skills and talent will be a great addition to our team. Together, we look forward to achieving new milestones and building a bright future.
</p>
      <br/>
      <p>Once again, welcome aboard! </p>
      <br/>
      <p>Best regards,<br/>HR Team </p>
      <p><strong>SPESHWAY SOLUTIONS PVT LTD<strong/></p>
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
 
    return res.status(200).json({ success: true, employee });
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
      <h2>Welcome to the SPESHWAY SOLUTION PVT LTD 🎉</h2>
      <p>Dear <b>${name}</b>,</p>
      <p>We are delighted to welcome you to Speshway Solution Pvt Ltd. We are excited to have you onboard as <b>${designation}</b> and look forward to working together towards achieving great success.
      </p>
      <p>Your login credentials are:</p>
      <p>Email: <b>${email}</b></p>
      <p>Password: <b>${rawPassword}</b></p>
      <p>Use the same credentials to log in to both the HRMS portal (attendance, payslip, leaves, and more) and your official company email (Webmail).</p>
      
      <p>You can login to the system using the following link:</p>
      <p><a href="https://www.speshwayhrms.com/" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Login to SPESHWAY HRMS</a></p>
      <p>Or copy and paste this URL in your browser: <b>https://www.speshwayhrms.com/</b></p>

      <p>Access your official company webmail:</p>
      <p><a href="https://webmail.speshway.com/" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Open Webmail</a></p>
      <p>Or copy and paste this URL in your browser: <b>https://webmail.speshway.com/</b></p>

      <p>
We believe your skills and talent will be a great addition to our team. Together, we look forward to achieving new milestones and building a bright future.
</p>
      <br/>
      <p>Once again, welcome aboard! </p>
      <br/>
      <p>Best regards,<br/>HR Team </p>
      <p><strong>SPESHWAY SOLUTIONS PVT LTD<strong/></p>
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
