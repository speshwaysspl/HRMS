import cron from 'node-cron';
import Event from '../models/Event.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../controllers/notificationController.js';
import { toISTDateString } from '../utils/dateTimeUtils.js';

export const initializeHolidayReminderScheduler = (io) => {
  console.log('📅 Initializing holiday reminder scheduler...');
  if (process.env.IS_LAMBDA === 'true' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log('⏸️ Skipping holiday scheduler in Lambda runtime');
    return null;
  }

  // Run daily at 9:00 AM IST
  const task = cron.schedule('0 9 * * *', async () => {
    console.log('📅 Running holiday reminder job (9:00 AM IST)...');
    try {
      // Compute tomorrow's date in IST, and create a Date object at midnight UTC for querying
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowISTString = toISTDateString(tomorrow); // YYYY-MM-DD in IST
      const tomorrowUTCStart = new Date(tomorrowISTString); // Midnight UTC for that date

      // Find holidays scheduled for tomorrow
      const holidaysTomorrow = await Event.find({ type: 'holiday', date: tomorrowUTCStart });
      if (!holidaysTomorrow || holidaysTomorrow.length === 0) {
        console.log('📭 No holidays found for tomorrow.');
        return;
      }

      // Pick a sender admin for notifications
      const senderAdmin = await User.findOne({ role: 'admin' });
      if (!senderAdmin) {
        console.warn('⚠️ No admin user found to use as sender for holiday reminders.');
        return;
      }

      // Load all active employees and their user accounts
      const employees = await Employee.find({ status: 'active' }).populate('userId', 'name email');
      if (!employees || employees.length === 0) {
        console.log('📭 No active employees to notify.');
        return;
      }

      for (const ev of holidaysTomorrow) {
        // Avoid duplicate reminders for the same holiday
        const alreadySent = await Notification.findOne({
          type: 'holiday',
          relatedId: ev._id,
          title: 'Holiday Tomorrow'
        });
        if (alreadySent) {
          console.log(`⏭️ Reminder already sent for holiday "${ev.title}" (${ev._id}). Skipping.`);
          continue;
        }

        const dateStr = new Date(ev.date).toDateString();
        const message = `${ev.title || 'Holiday'} tomorrow (${dateStr})`;

        // Send to each employee
        for (const emp of employees) {
          if (!emp.userId || !emp.userId._id) continue;
          const data = {
            type: 'holiday',
            title: 'Holiday Tomorrow',
            message,
            senderId: senderAdmin._id,
            recipientId: emp.userId._id,
            relatedId: ev._id
          };
          await createNotification(data, io);
        }
        console.log(`✅ Holiday reminder notifications sent for "${ev.title}" on ${dateStr}`);
      }
    } catch (error) {
      console.error('❌ Error in holiday reminder job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ Holiday reminder scheduler initialized - will run daily at 9:00 AM IST');
  return task;
};
