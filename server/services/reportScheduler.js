import cron from 'node-cron';
import User from '../models/User.js';
import ReportSubscription from '../models/ReportSubscription.js';
import sendEmail from '../utils/sendEmail.js';
import { buildWeeklySummaryReport } from './reportService.js';

export const initializeWeeklyReportScheduler = () => {
  console.log('📊 Initializing weekly report scheduler...');

  // Run every Monday at 8:00 AM IST
  const task = cron.schedule('0 8 * * 1', async () => {
    console.log('📊 Running weekly summary report job (Monday 8:00 AM IST)...');
    try {
      const recipients = await User.find({ role: { $in: ['admin', 'hr'] } });
      if (!recipients || recipients.length === 0) {
        console.log('📭 No admin/HR users to send the weekly report to.');
        return;
      }

      const { buffer, filename } = await buildWeeklySummaryReport();

      for (const user of recipients) {
        const subscription = await ReportSubscription.findOne({ userId: user._id });
        // Default to enabled if no subscription record exists yet
        if (subscription && subscription.weeklySummaryEnabled === false) continue;

        await sendEmail(
          user.email,
          'Weekly HRMS Summary Report',
          '<p>Please find attached the weekly attendance and leave summary report.</p>',
          [{ filename, content: buffer }]
        );
      }
      console.log(`✅ Weekly summary report sent to ${recipients.length} recipient(s).`);
    } catch (error) {
      console.error('❌ Error in weekly report job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  console.log('✅ Weekly report scheduler initialized - will run every Monday at 8:00 AM IST');
  return task;
};
