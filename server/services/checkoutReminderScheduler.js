import cron from 'node-cron';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../controllers/notificationController.js';
import { toISTDateString } from '../utils/dateTimeUtils.js';

// Reminds anyone still checked in (no check-out yet) to check out, so a
// forgotten check-out doesn't turn the day into a Half-Day at midnight.
export const initializeCheckoutReminderScheduler = (io) => {
  const task = cron.schedule('0 19 * * *', async () => {
    try {
      const today = toISTDateString(new Date());
      const open = await Attendance.find({
        date: today,
        inTime: { $nin: [null, ''] },
        $or: [{ outTime: '' }, { outTime: null }, { outTime: { $exists: false } }],
      });
      if (open.length === 0) return;

      const sender = await User.findOne({ role: 'admin' });
      if (!sender) return;

      for (const rec of open) {
        // Attendance.userId holds the Employee _id; notifications go to the User.
        const emp = await Employee.findById(rec.userId).select('userId');
        if (!emp?.userId) continue;
        const already = await Notification.findOne({
          type: 'checkout_reminder',
          recipientId: emp.userId,
          relatedId: rec._id,
        });
        if (already) continue;
        await createNotification({
          type: 'checkout_reminder',
          title: 'Don\'t forget to check out',
          message: `You checked in at ${rec.inTime} and haven't checked out yet. Check out before midnight, or today will be marked Half-Day.`,
          recipientId: emp.userId,
          senderId: sender._id,
          relatedId: rec._id,
        }, io);
      }
      console.log(`⏰ Check-out reminders sent: ${open.length}`);
    } catch (error) {
      console.error('❌ Error in check-out reminder job:', error);
    }
  }, { scheduled: true, timezone: 'Asia/Kolkata' });

  console.log('✅ Check-out reminder scheduler initialized - daily at 7:00 PM IST');
  return task;
};
