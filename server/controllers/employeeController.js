import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import sendEmail from "../utils/sendEmail.js";
 
// Add new employee
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
 
    // === Send Welcome Email ===
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

    sendEmail(email, "Welcome to Speshway Solutions 🎉", emailHtml);
 
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
    const { name, email, employeeId, dob, gender, mobilenumber, designation, department, role, salary, joiningDate } = req.body;
 
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
 
    // Update user
    const updatedUserData = { name, email };
    await User.findByIdAndUpdate(user._id, updatedUserData);
 
    // Update employee
    await Employee.findByIdAndUpdate(id, {
      employeeId,
      dob,
      gender,
      mobilenumber,
      designation,
      department,
      role,
      joiningDate,
    });
 
    return res.status(200).json({ success: true, message: "Employee updated" });
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
  deleteEmployee
};
