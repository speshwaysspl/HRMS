import Employee from '../models/Employee.js';

/**
 * Get employees who have birthdays today
 * @returns {Promise<Array>} Array of employees with birthdays today
 */
export const getTodaysBirthdays = async () => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const todayDate = today.getDate();
    
    console.log(`🔍 Checking birthdays for: ${todayDate}/${todayMonth}/${today.getFullYear()}`);

    // Get all employees
    const employees = await Employee.find({
      status: 'active' // Only active employees (lowercase as per schema)
    }).populate('userId', 'name email').populate('department', 'dep_name');
    
    console.log(`📊 Found ${employees.length} active employees`);

    // Filter employees whose birthday is today
    const birthdayEmployees = employees.filter(employee => {
      if (!employee.dob) return false;
      
      const dob = new Date(employee.dob);
      const dobMonth = dob.getMonth() + 1;
      const dobDate = dob.getDate();
      
      const isMatch = dobMonth === todayMonth && dobDate === todayDate;
      
      if (isMatch) {
        console.log(`🎂 Birthday match found: ${employee.userId?.name} - DOB: ${dobDate}/${dobMonth}`);
      }
      
      return isMatch;
    });
    
    console.log(`🎉 Found ${birthdayEmployees.length} birthday(s) today`);
    return birthdayEmployees;
  } catch (error) {
    console.error('Error fetching today\'s birthdays:', error);
    return [];
  }
};

/**
 * Check if a specific date is today
 * @param {Date} date - Date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return today.getMonth() === checkDate.getMonth() && 
         today.getDate() === checkDate.getDate();
};

/**
 * Get birthday message template
 * @param {Object} employee - Employee object
 * @returns {string} Birthday message
 */
export const getBirthdayMessage = (employee) => {
  const name = employee.userId?.name || 'Employee';
  
  return `🎉 Happy Birthday ${name}! 🎂\n\nWishing you a wonderful day filled with happiness and joy. May this new year of your life bring you success, good health, and prosperity.\n\nFrom all of us at SPESHWAY SOLUTIONS PRIVATE LIMITED`;
};

/**
 * Get birthday email HTML template
 * @param {Object} employee - Employee object
 * @returns {string} HTML email template
 */
export const getBirthdayEmailTemplate = (employee) => {
  const name = employee.userId?.name || 'Employee';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .birthday-icon { font-size: 48px; margin-bottom: 20px; }
            .title { color: #2c3e50; font-size: 28px; margin-bottom: 10px; }
            .message { color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
            .footer { text-align: center; color: #7f8c8d; font-size: 14px; border-top: 1px solid #ecf0f1; padding-top: 20px; }
            .company-name { color: #3498db; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="birthday-icon">🎉🎂🎈</div>
                <h1 class="title">Happy Birthday ${name}!</h1>
            </div>
            
            <div class="message">
                <p>Dear ${name},</p>
                
                <p>On this special day, we want to take a moment to celebrate you! Your dedication, hard work, and positive attitude make our workplace a better place every day.</p>
                
                <p>May this new year of your life be filled with:</p>
                <ul>
                    <li>🌟 Success in all your endeavors</li>
                    <li>💪 Good health and happiness</li>
                    <li>🚀 New opportunities and growth</li>
                    <li>😊 Joy and wonderful memories</li>
                </ul>
                
                <p>Thank you for being such a valuable member of our team. We're grateful to have you with us!</p>
                
                <p>Wishing you the happiest of birthdays!</p>
            </div>
            
            <div class="footer">
                <p>With warm wishes,</p>
                <p class="company-name">SPESHWAY SOLUTIONS PRIVATE LIMITED</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
