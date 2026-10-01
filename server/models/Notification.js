import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'leave_request',
      'leave_approved',
      'leave_rejected',
      'announcement',
      'feedback_submitted',
      'feedback_response',
      'task_assigned',
      'task_updated',
      'task_submitted',
      'payslip_generated',
      'birthday',
      'holiday',
      'meeting',
      'event',
      'candidate_created',
      'profile_completed',
      'documents_uploaded',
      'document_approved',
      'document_rejected',
      'document_expiring',
      'verification_completed',
      'checkout_reminder',
      'team_attendance_reminder',
      'team_attendance_marked',
      'regularization_request',
      'regularization_approved',
      'regularization_rejected',
      'birthday_wish',
      'other'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // ID of related leave or announcement
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ recipientId: 1, createdAt: -1 });
// Same notification to the same person within a 10-minute window is stored once,
// even when several server processes run the same scheduled job.
notificationSchema.add({ dedupeKey: { type: String } });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
