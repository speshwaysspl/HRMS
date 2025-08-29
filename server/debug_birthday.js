import Employee from './models/Employee.js';
import { getTodaysBirthdays } from './utils/birthdayChecker.js';
import { processBirthdayWishes } from './services/birthdayService.js';
import './db/db.js';

// Debug script to check birthday functionality
async function debugBirthdays() {
  try {
    console.log('=== Birthday Debug Script ===');
    
    // Get current date info
    const today = new Date();
    console.log('Today\'s date:', today.toISOString());
    console.log('Today\'s month:', today.getMonth() + 1);
    console.log('Today\'s date:', today.getDate());
    
    // Find the specific employee (Srikanth)
    const srikanth = await Employee.findOne({
      'userId.name': 'srikanth'
    }).populate('userId', 'name email').populate('department', 'dep_name');
    
    if (srikanth) {
      console.log('\n=== Srikanth Employee Data ===');
      console.log('Name:', srikanth.userId?.name);
      console.log('DOB:', srikanth.dob);
      console.log('DOB ISO:', new Date(srikanth.dob).toISOString());
      console.log('DOB Month:', new Date(srikanth.dob).getMonth() + 1);
      console.log('DOB Date:', new Date(srikanth.dob).getDate());
      console.log('Status:', srikanth.status);
    } else {
      console.log('Srikanth not found, searching all employees...');
      const allEmployees = await Employee.find({}).populate('userId', 'name email');
      console.log('All employees:', allEmployees.map(emp => ({
        name: emp.userId?.name,
        dob: emp.dob,
        status: emp.status
      })));
    }
    
    // Check today's birthdays
    console.log('\n=== Today\'s Birthdays ===');
    const todaysBirthdays = await getTodaysBirthdays();
    console.log('Found birthdays:', todaysBirthdays.length);
    todaysBirthdays.forEach(emp => {
      console.log('- Name:', emp.userId?.name);
      console.log('  DOB:', emp.dob);
      console.log('  Email:', emp.userId?.email);
    });
    
    // Try to process birthday wishes
    console.log('\n=== Processing Birthday Wishes ===');
    const result = await processBirthdayWishes();
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugBirthdays();