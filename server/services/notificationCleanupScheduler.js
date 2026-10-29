import cron from 'node-cron';
import Notification from '../models/Notification.js';

// Wipes every user's notifications once a day so the collection doesn't grow
// without bound. Runs at midnight IST, after the day's reminders are done.
export const initializeNotificationCleanupScheduler = () => {
  const task = cron.schedule('0 0 * * *', async () => {
    try {
      const { deletedCount } = await Notification.deleteMany({});
      console.log(`🧹 Notification cleanup: deleted ${deletedCount}`);
    } catch (error) {
      console.error('❌ Error in notification cleanup job:', error);
    }
  }, { scheduled: true, timezone: 'Asia/Kolkata' });

  console.log('✅ Notification cleanup scheduler initialized - daily at 12:00 AM IST');
  return task;
};
