import Employee from './models/Employee.js';
import Announcement from './models/Announcement.js';
import User from './models/User.js';
import sendEmail from './utils/sendEmail.js';
import { getBirthdayMessage, getBirthdayEmailTemplate } from './utils/birthdayChecker.js';
import './db/db.js';

// Manual birthday announcement for Srikanth
async function createManualBirthdayAnnouncement() {
  try {
    console.log('🎂 Creating manual birthday announcement for Srikanth...');
    
    // Find Srikanth by employee ID or name
    const employee = await Employee.findOne({
      employeeId: '123456' // Based on the screenshot
    }).populate('userId', 'name email').populate('department', 'dep_name');
    
    if (!employee) {
      console.log('❌ Employee not found, searching by other criteria...');
      // Try to find by populated user name
      const allEmployees = await Employee.find({}).populate('userId', 'name email');
      const srikanth = allEmployees.find(emp => 
        emp.userId?.name?.toLowerCase().includes('srikanth')
      );
      
      if (srikanth) {
        console.log('✅ Found employee:', srikanth.userId.name);
        await createBirthdayContent(srikanth);
      } else {
        console.log('❌ Could not find Srikanth in database');
      }
      return;
    }
    
    await createBirthdayContent(employee);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

async function createBirthdayContent(employee) {
  try {
    const employeeName = employee.userId?.name || 'Employee';
    const employeeEmail = employee.userId?.email;
    const department = employee.department?.dep_name || 'Unknown';
    
    console.log(`🎉 Creating birthday content for: ${employeeName}`);
    
    // Get system admin for creating announcement
    const systemAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    if (!systemAdmin) {
      console.log('❌ No admin user found');
      return;
    }
    
    // Create birthday announcement
    const announcement = new Announcement({
      title: `🎂 Happy Birthday ${employeeName}! 🎉`,
      description: `Join us in wishing ${employeeName} from ${department} department a very Happy Birthday! 🎂🎉\n\nWishing you a wonderful year ahead filled with success, happiness, and great achievements!\n\n#Birthday #Celebration #TeamSpeshway`,
      createdBy: systemAdmin._id
    });
    
    await announcement.save();
    console.log('✅ Birthday announcement created successfully!');
    
    // Send birthday email if email exists
    if (employeeEmail) {
      const emailTemplate = getBirthdayEmailTemplate(employee);
      const emailResult = await sendEmail(
        employeeEmail,
        `🎂 Happy Birthday ${employeeName}! 🎉`,
        emailTemplate
      );
      
      if (emailResult.success) {
        console.log(`✅ Birthday email sent to ${employeeEmail}`);
      } else {
        console.log(`❌ Failed to send email: ${emailResult.message}`);
      }
    } else {
      console.log('⚠️ No email address found for employee');
    }
    
    console.log('🎂 Manual birthday process completed!');
    
  } catch (error) {
    console.error('❌ Error creating birthday content:', error);
  }
}

createManualBirthdayAnnouncement();