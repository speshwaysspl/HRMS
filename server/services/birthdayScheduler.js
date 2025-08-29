import cron from 'node-cron';
import { processBirthdayWishes } from './birthdayService.js';

/**
 * Initialize the birthday wishes scheduler
 * Runs daily at 9:00 AM to check for birthdays and send wishes
 */
export const initializeBirthdayScheduler = () => {
  console.log('🎂 Initializing birthday wishes scheduler...');
  
  // Schedule to run daily at 11:45 PM IST (6:15 PM UTC)
  // Cron format: '45 23 * * *' = At 11:45 PM every day
  const task = cron.schedule('45 23 * * *', async () => {
    console.log('🎂 Running daily birthday wishes check at 11:45 PM IST...');
    
    try {
      const result = await processBirthdayWishes();
      
      if (result.success) {
        console.log(`✅ Scheduled birthday wishes completed: ${result.message}`);
        
        if (result.count > 0) {
          console.log(`🎉 Processed ${result.count} birthday(s):`);
          result.employees.forEach(emp => {
            console.log(`   - ${emp.name} (${emp.department})`);
          });
        }
      } else {
        console.error('❌ Scheduled birthday wishes failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error in scheduled birthday wishes:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // Adjust timezone as needed
  });
  
  console.log('✅ Birthday wishes scheduler initialized - will run daily at 11:45 PM IST');
  
  return task;
};

/**
 * Stop the birthday wishes scheduler
 * @param {Object} task - The cron task to stop
 */
export const stopBirthdayScheduler = (task) => {
  if (task) {
    task.stop();
    console.log('🛑 Birthday wishes scheduler stopped');
  }
};

/**
 * Get scheduler status
 * @param {Object} task - The cron task
 * @returns {Object} Status information
 */
export const getSchedulerStatus = (task) => {
  return {
    isRunning: task ? task.running : false,
    nextRun: task ? task.nextDate() : null,
    schedule: '45 23 * * *', // Daily at 11:45 PM
    timezone: 'Asia/Kolkata',
    description: 'Daily birthday wishes at 11:45 PM IST'
  };
};

/**
 * Manual test run (for development/testing)
 * Runs the birthday wishes process immediately
 */
export const testBirthdayScheduler = async () => {
  console.log('🧪 Running birthday wishes test...');
  
  try {
    const result = await processBirthdayWishes();
    console.log('🧪 Test completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, message: error.message };
  }
};