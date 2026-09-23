import { getTodaysBirthdays, getBirthdayMessage, getBirthdayEmailTemplate } from '../utils/birthdayChecker.js';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { enqueueEmail } from '../utils/emailQueue.js';
import { createNotification } from '../controllers/notificationController.js';

/**
 * Process birthday wishes for all employees with birthdays today
 * Creates announcements and sends emails
 * @param {Object} [io] - Socket.IO server, for real-time delivery of the
 * personal birthday notification (push still sends without it).
 */
export const processBirthdayWishes = async (io) => {
  try {
    console.log('🎂 Starting birthday wishes process...');
    
    // Get employees with birthdays today
    const birthdayEmployees = await getTodaysBirthdays();
    
    if (birthdayEmployees.length === 0) {
      console.log('📅 No birthdays today');
      return { success: true, message: 'No birthdays today', count: 0 };
    }
    
    console.log(`🎉 Found ${birthdayEmployees.length} birthday(s) today`);
    
    // Get system admin user for creating announcements
    const systemAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    if (!systemAdmin) {
      console.error('❌ No admin user found for creating announcements');
      return { success: false, message: 'No admin user found', count: 0 };
    }
    
    let successCount = 0;
    let emailSuccessCount = 0;
    let announcementSuccessCount = 0;
    
    // Process each birthday employee
    for (const employee of birthdayEmployees) {
      try {
        const employeeName = employee.userId?.name || 'Employee';
        const employeeEmail = employee.userId?.email;
        
        console.log(`🎂 Processing birthday for: ${employeeName}`);
        
        // Create announcement
        const announcementResult = await createBirthdayAnnouncement(employee, systemAdmin._id);
        if (announcementResult.success) {
          announcementSuccessCount++;
          console.log(`📢 Announcement created for ${employeeName}`);
        }
        
        // Send birthday email
        if (employeeEmail) {
          const emailResult = await sendBirthdayEmail(employee);
          if (emailResult.success) {
            emailSuccessCount++;
            console.log(`📧 Email sent to ${employeeName} (${employeeEmail})`);
          }
        } else {
          console.log(`⚠️ No email address found for ${employeeName}`);
        }

        // Send a personal in-app + push notification to the birthday employee
        if (employee.userId?._id) {
          try {
            await createNotification({
              type: 'birthday',
              title: `🎉 Happy Birthday, ${employeeName}!`,
              message: 'Wishing you a fantastic day and a great year ahead from all of us at Speshway!',
              recipientId: employee.userId._id,
              senderId: systemAdmin._id,
              relatedId: announcementResult.announcementId
            }, io);
            console.log(`🔔 Birthday notification sent to ${employeeName}`);
          } catch (notificationError) {
            console.error(`❌ Error sending birthday notification to ${employeeName}:`, notificationError.message);
          }
        }

        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing birthday for employee ${employee.userId?.name}:`, error.message);
      }
    }
    
    const result = {
      success: true,
      message: `Processed ${successCount}/${birthdayEmployees.length} birthdays`,
      count: birthdayEmployees.length,
      successCount,
      announcementSuccessCount,
      emailSuccessCount,
      employees: birthdayEmployees.map(emp => ({
        name: emp.userId?.name,
        email: emp.userId?.email,
        department: emp.department?.dep_name
      }))
    };
    
    console.log('🎉 Birthday wishes process completed:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error in birthday wishes process:', error);
    return { success: false, message: error.message, count: 0 };
  }
};

/**
 * Create a birthday announcement for an employee
 * @param {Object} employee - Employee object
 * @param {String} adminId - Admin user ID for creating announcement
 * @returns {Object} Result object
 */
export const createBirthdayAnnouncement = async (employee, adminId) => {
  try {
    const employeeName = employee.userId?.name || 'Employee';
    const department = employee.department?.dep_name || 'Department';
    
    const announcement = new Announcement({
      title: `🎉 Happy Birthday ${employeeName}! 🎂`,
      description: getBirthdayMessage(employee),
      createdBy: adminId,
      image: null // You can add a default birthday image URL here if needed
    });
    
    await announcement.save();
    
    return {
      success: true,
      message: `Birthday announcement created for ${employeeName}`,
      announcementId: announcement._id
    };
    
  } catch (error) {
    console.error('Error creating birthday announcement:', error);
    return {
      success: false,
      message: `Failed to create announcement: ${error.message}`
    };
  }
};

/**
 * Send birthday email to an employee
 * @param {Object} employee - Employee object
 * @returns {Object} Result object
 */
export const sendBirthdayEmail = async (employee) => {
  try {
    const employeeName = employee.userId?.name || 'Employee';
    const employeeEmail = employee.userId?.email;
    
    if (!employeeEmail) {
      return {
        success: false,
        message: `No email address found for ${employeeName}`
      };
    }
    
    const subject = `🎉 Happy Birthday ${employeeName}! - SPESHWAY SOLUTIONS`;
    const htmlContent = getBirthdayEmailTemplate(employee);
    
    enqueueEmail(employeeEmail, subject, htmlContent);
    
    return {
      success: true,
      message: `Birthday email sent to ${employeeName} (${employeeEmail})`
    };
    
  } catch (error) {
    console.error('Error sending birthday email:', error);
    return {
      success: false,
      message: `Failed to send email: ${error.message}`
    };
  }
};

/**
 * Manual trigger for birthday wishes (for testing or manual execution)
 * @returns {Object} Result object
 */
export const triggerBirthdayWishes = async () => {
  console.log('🎂 Manually triggering birthday wishes...');
  return await processBirthdayWishes();
};

/**
 * Get today's birthday employees (for API endpoint)
 * @returns {Object} Result object with birthday employees
 */
export const getTodaysBirthdayEmployees = async () => {
  try {
    const birthdayEmployees = await getTodaysBirthdays();
    
    return {
      success: true,
      count: birthdayEmployees.length,
      employees: birthdayEmployees.map(emp => ({
        id: emp._id,
        name: emp.userId?.name,
        email: emp.userId?.email,
        department: emp.department?.dep_name,
        designation: emp.designation,
        dob: emp.dob
      }))
    };
    
  } catch (error) {
    console.error('Error getting today\'s birthday employees:', error);
    return {
      success: false,
      message: error.message,
      count: 0,
      employees: []
    };
  }
};
