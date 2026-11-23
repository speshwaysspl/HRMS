import cron from 'node-cron';
import Notification from '../models/Notification.js';

// Wipes every user's notifications once a day so the collection doesn't grow
// without bound. Runs at midnight IST, after the day's reminders are done.
// Only notifications created BEFORE midnight are removed: the birthday-wishes job
// also fires at 00:00 and its new notifications must survive this cleanup.
export const initializeNotificationCleanupScheduler = () => {
  const task = cron.schedule('0 0 * * *', async () => {
    try {
      const cutoff = new Date();
      cutoff.setSeconds(0, 0); // start of this minute = midnight IST
      const { deletedCount } = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
      console.log(`🧹 Notification cleanup: deleted ${deletedCount}`);
    } catch (error) {
      console.error('❌ Error in notification cleanup job:', error);
    }
  }, { scheduled: true, timezone: 'Asia/Kolkata' });

  console.log('✅ Notification cleanup scheduler initialized - daily at 12:00 AM IST');
  return task;
};
