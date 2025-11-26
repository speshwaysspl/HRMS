// backend/controllers/payrollTemplateController.js
import PayrollTemplate from "../models/PayrollTemplate.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Create new payroll template
export const createTemplate = async (req, res) => {
  try {
    const payload = req.body;
    const { userId } = req.user; // From auth middleware
    
    // Validate employee exists
    const employee = await Employee.findOne({ employeeId: payload.employeeId })
      .populate('userId', 'name')
      .populate('department', 'dep_name');
    
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }
    
    // Get values directly from payload
    let hra = num(payload.hra);
    let pf = num(payload.pf);
    
    if (payload.autoCalculatePF) {
      pf = (num(payload.basicSalary) * num(payload.pfPercentage || 12)) / 100;
    }
    
    const newTemplate = new PayrollTemplate({
      employeeId: employee._id,
      templateName: payload.templateName || `${employee.userId.name} - Default Template`,
      
      // Auto-fill employee details
      name: employee.userId.name,
      designation: employee.designation,
      department: employee.department.dep_name,
      joiningDate: employee.createdAt,
      location: payload.location || "",
      
      // Bank and identity details
      bankname: payload.bankname || "",
      bankaccountnumber: payload.bankaccountnumber || "",
      pan: payload.pan || "",
      uan: payload.uan || "",
      
      // Salary structure
      basicSalary: num(payload.basicSalary),
      da: num(payload.da),
      hra: num(payload.hra),
      conveyance: num(payload.conveyance),
      medicalallowances: num(payload.medicalallowances),
      specialallowances: num(payload.specialallowances),
      
      proftax: num(payload.proftax),
      pf: Number(pf.toFixed(2)),
      deductions: num(payload.deductions),
      
      // Calculation settings
      autoCalculatePF: Boolean(payload.autoCalculatePF),
      pfPercentage: num(payload.pfPercentage) || 12,
      
      isActive: payload.isActive !== false,
      isDefault: Boolean(payload.isDefault),
      
      createdBy: userId,
      lastModifiedBy: userId,
      notes: payload.notes || ""
    });
    
    await newTemplate.save();
    
    return res.status(201).json({ 
      success: true, 
      template: newTemplate,
      message: "Payroll template created successfully"
    });
  } catch (error) {
    console.error("Create Template error:", error);
    return res.status(500).json({ success: false, error: "Template creation server error" });
  }
};

// Get all templates for an employee
export const getEmployeeTemplates = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }
    
    const templates = await PayrollTemplate.find({ 
      employeeId: employee._id,
      isActive: true 
    })
    .populate('createdBy', 'name')
    .populate('lastModifiedBy', 'name')
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

    // Calculate net salary for each template
    const templatesWithNetSalary = templates.map(template => {
      // Calculate total earnings
      const totalEarnings = (template.basicSalary || 0) +
                           (template.da || 0) +
                           (template.hra || 0) +
                           (template.conveyance || 0) +
                           (template.medicalallowances || 0) +
                           (template.specialallowances || 0);
      
      // Calculate total deductions
      const totalDeductions = (template.proftax || 0) +
                             (template.pf || 0) +
                             (template.deductions || 0);
      
      // Calculate net salary
      const netSalary = Math.max(0, totalEarnings - totalDeductions);
      
      return {
        ...template,
        totalEarnings,
        totalDeductions,
        netSalary
      };
    });

    return res.status(200).json({ success: true, templates: templatesWithNetSalary });
  } catch (error) {
    console.error("Get Employee Templates error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get all templates (admin view)
export const getAllTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { templateName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    
    const templates = await PayrollTemplate.find(query)
      .populate('employeeId', 'employeeId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    // Transform the templates to include employeeId as string and calculate netSalary
    const transformedTemplates = templates.map(template => {
      // Calculate total earnings
      const totalEarnings = (template.basicSalary || 0) +
                           (template.da || 0) +
                           (template.hra || 0) +
                           (template.conveyance || 0) +
                           (template.medicalallowances || 0) +
                           (template.specialallowances || 0);
      
      // Calculate total deductions
      const totalDeductions = (template.proftax || 0) +
                             (template.pf || 0) +
                             (template.deductions || 0);
      
      // Calculate net salary
      const netSalary = Math.max(0, totalEarnings - totalDeductions);
      
      return {
        ...template,
        employeeId: template.employeeId?.employeeId || template.employeeId,
        totalEarnings,
        totalDeductions,
        netSalary
      };
    });
    
    const total = await PayrollTemplate.countDocuments(query);
    
    return res.status(200).json({ 
      success: true, 
      templates: transformedTemplates,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Get All Templates error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get single template by ID
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await PayrollTemplate.findById(id)
      .populate('employeeId', 'employeeId')
      .populate('createdBy', 'name')
      .populate('lastModifiedBy', 'name');
    
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    
    return res.status(200).json({ success: true, template });
  } catch (error) {
    console.error("Get Template error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Update template
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const { userId } = req.user;
    
    const template = await PayrollTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    
    // Get values directly from payload
    let hra = num(payload.hra);
    let pf = num(payload.pf);
    
    if (payload.autoCalculatePF) {
      pf = (num(payload.basicSalary) * num(payload.pfPercentage || 12)) / 100;
    }
    
    // Update template fields
    const updateFields = {
      templateName: payload.templateName || template.templateName,
      location: payload.location || template.location,
      bankname: payload.bankname || template.bankname,
      bankaccountnumber: payload.bankaccountnumber || template.bankaccountnumber,
      pan: payload.pan || template.pan,
      uan: payload.uan || template.uan,
      
      basicSalary: num(payload.basicSalary) || template.basicSalary,
      da: num(payload.da) || template.da,
      hra: num(payload.hra) || template.hra,
      conveyance: num(payload.conveyance) || template.conveyance,
      medicalallowances: num(payload.medicalallowances) || template.medicalallowances,
      specialallowances: num(payload.specialallowances) || template.specialallowances,
      
      proftax: num(payload.proftax) || template.proftax,
      pf: Number(pf.toFixed(2)),
      deductions: num(payload.deductions) || template.deductions,
      

      autoCalculatePF: payload.autoCalculatePF !== undefined ? Boolean(payload.autoCalculatePF) : template.autoCalculatePF,
      pfPercentage: num(payload.pfPercentage) || template.pfPercentage,
      
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : template.isActive,
      isDefault: payload.isDefault !== undefined ? Boolean(payload.isDefault) : template.isDefault,
      
      lastModifiedBy: userId,
      notes: payload.notes !== undefined ? payload.notes : template.notes
    };
    
    const updatedTemplate = await PayrollTemplate.findByIdAndUpdate(
      id, 
      updateFields, 
      { new: true, runValidators: true }
    )
    .populate('employeeId', 'employeeId')
    .populate('createdBy', 'name')
    .populate('lastModifiedBy', 'name');
    
    return res.status(200).json({ 
      success: true, 
      template: updatedTemplate,
      message: "Template updated successfully"
    });
  } catch (error) {
    console.error("Update Template error:", error);
    return res.status(500).json({ success: false, error: "Template update server error" });
  }
};

// Delete template (soft delete)
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    
    const template = await PayrollTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    
    // Soft delete by setting isActive to false
    template.isActive = false;
    template.lastModifiedBy = userId;
    await template.save();
    
    return res.status(200).json({ 
      success: true, 
      message: "Template deleted successfully"
    });
  } catch (error) {
    console.error("Delete Template error:", error);
    return res.status(500).json({ success: false, error: "Template deletion server error" });
  }
};

// Set template as default
export const setDefaultTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    
    const template = await PayrollTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    
    // Remove default flag from other templates of the same employee
    await PayrollTemplate.updateMany(
      { 
        employeeId: template.employeeId, 
        _id: { $ne: id },
        isDefault: true 
      },
      { 
        isDefault: false,
        lastModifiedBy: userId
      }
    );
    
    // Set this template as default
    template.isDefault = true;
    template.lastModifiedBy = userId;
    await template.save();
    
    return res.status(200).json({ 
      success: true, 
      message: "Template set as default successfully"
    });
  } catch (error) {
    console.error("Set Default Template error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};



// Get template statistics
export const getTemplateStats = async (req, res) => {
  try {
    const totalTemplates = await PayrollTemplate.countDocuments({ isActive: true });
    const defaultTemplates = await PayrollTemplate.countDocuments({ isActive: true, isDefault: true });
    const activeTemplates = await PayrollTemplate.countDocuments({ isActive: true });
    
    // Get templates by department
    const departmentStats = await PayrollTemplate.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    return res.status(200).json({ 
      success: true, 
      stats: {
        totalTemplates,
        defaultTemplates,
        activeTemplates,
        departmentStats
      }
    });
  } catch (error) {
    console.error("Get Template Stats error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Bulk set defaults - set first active template as default for each employee
export const bulkSetDefaults = async (req, res) => {
  try {
    const results = [];
    const errors = [];
    
    // Get all employees
    const employees = await Employee.find().populate('userId', 'name');
    
    for (const employee of employees) {
      try {
        // Check if employee already has a default template
        const existingDefault = await PayrollTemplate.findOne({
          employeeId: employee._id,
          isDefault: true,
          isActive: true
        });
        
        if (existingDefault) {
          results.push({
            employeeId: employee.employeeId,
            name: employee.userId?.name,
            status: 'Already has default template',
            templateName: existingDefault.templateName
          });
          continue;
        }
        
        // Find first active template for this employee
        const activeTemplate = await PayrollTemplate.findOne({
          employeeId: employee._id,
          isActive: true
        });
        
        if (!activeTemplate) {
          errors.push({
            employeeId: employee.employeeId,
            name: employee.userId?.name,
            error: 'No active templates found'
          });
          continue;
        }
        
        // Set this template as default
        activeTemplate.isDefault = true;
        await activeTemplate.save();
        
        results.push({
          employeeId: employee.employeeId,
          name: employee.userId?.name,
          status: 'Set as default',
          templateName: activeTemplate.templateName
        });
        
      } catch (error) {
        errors.push({
          employeeId: employee.employeeId,
          name: employee.userId?.name,
          error: error.message
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Bulk set defaults completed',
      processed: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
    
  } catch (error) {
    console.error('Bulk set defaults error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during bulk set defaults' 
    });
  }
};

// Quick fix for current issue - set kishore's template as default
export const quickFixDefaults = async (req, res) => {
  try {
    const results = [];
    
    // Find kishore's template and set as default
    const kishoreTemplate = await PayrollTemplate.findOne({
      employeeId: { $exists: true },
      isActive: true,
      isDefault: false
    }).populate('employeeId');
    
    if (kishoreTemplate) {
      kishoreTemplate.isDefault = true;
      await kishoreTemplate.save();
      
      results.push({
        employeeId: kishoreTemplate.employeeId.employeeId,
        templateName: kishoreTemplate.templateName,
        status: 'Set as default'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Quick fix applied',
      results
    });
    
  } catch (error) {
    console.error('Quick fix error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during quick fix' 
    });
  }
};

// Get active employees with their default payroll templates for payslip generation
export const getActiveEmployeesForPayslip = async (req, res) => {
  try {
    // Get all active employees with their user details
    const employees = await Employee.find({ status: 'active' })
      .populate('userId', 'name')
      .select('_id employeeId userId');
    
    const employeesWithTemplates = [];
    
    for (const employee of employees) {
      // Find default payroll template for each employee
      const defaultTemplate = await PayrollTemplate.findOne({
        employeeId: employee._id,
        isDefault: true,
        isActive: true
      });
      
      if (defaultTemplate) {
        employeesWithTemplates.push({
          _id: employee._id,
          employeeId: employee.employeeId,
          name: employee.userId?.name || 'Unknown',
          templateId: defaultTemplate._id,
          templateName: defaultTemplate.templateName
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      employees: employeesWithTemplates,
      count: employeesWithTemplates.length
    });
    
  } catch (error) {
    console.error('Get active employees for payslip error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error while fetching active employees' 
    });
  }
};