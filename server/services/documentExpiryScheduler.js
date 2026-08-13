import cron from 'node-cron';
import Document from '../models/Document.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../controllers/notificationController.js';

export const initializeDocumentExpiryScheduler = (io) => {
  console.log('📄 Initializing document expiry scheduler...');

  // Run daily at 9:30 AM IST
  const task = cron.schedule('30 9 * * *', async () => {
    console.log('📄 Running document expiry check (9:30 AM IST)...');
    try {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringDocs = await Document.find({
        expiryDate: { $ne: null, $gte: now, $lte: in30Days },
      }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } });

      if (!expiringDocs || expiringDocs.length === 0) {
        console.log('📭 No documents expiring in the next 30 days.');
        return;
      }

      const senderAdmin = await User.findOne({ role: 'admin' });
      if (!senderAdmin) {
        console.warn('⚠️ No admin user found to use as sender for document expiry reminders.');
        return;
      }

      const hrUsers = await User.find({ role: 'hr' });

      for (const doc of expiringDocs) {
        if (!doc.employeeId?.userId?._id) continue;

        // Avoid duplicate reminders for the same document
        const alreadySent = await Notification.findOne({
          type: 'document_expiring',
          relatedId: doc._id,
        });
        if (alreadySent) continue;

        const expiryStr = new Date(doc.expiryDate).toDateString();
        const message = `${doc.originalName || doc.documentType} is expiring on ${expiryStr}`;

        await createNotification(
          {
            type: 'document_expiring',
            title: 'Document Expiring Soon',
            message,
            senderId: senderAdmin._id,
            recipientId: doc.employeeId.userId._id,
            relatedId: doc._id,
          },
          io
        );

        for (const hr of hrUsers) {
          await createNotification(
            {
              type: 'document_expiring',
              title: 'Employee Document Expiring Soon',
              message: `${doc.employeeId.userId.name || 'An employee'}'s ${doc.documentType} is expiring on ${expiryStr}`,
              senderId: senderAdmin._id,
              recipientId: hr._id,
              relatedId: doc._id,
            },
            io
          );
        }

        console.log(`✅ Expiry reminder sent for document "${doc.originalName}" (${doc._id})`);
      }
    } catch (error) {
      console.error('❌ Error in document expiry job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  console.log('✅ Document expiry scheduler initialized - will run daily at 9:30 AM IST');
  return task;
};
