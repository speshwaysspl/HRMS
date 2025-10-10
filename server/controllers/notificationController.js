import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

// Create and broadcast a single notification
const createNotification = async (notificationData, io) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    await notification.populate('senderId', 'name email');
    await notification.populate('recipientId', 'name email');

    const roomName = `user_${notificationData.recipientId}`;
    if (io) io.to(roomName).emit('newNotification', notification);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create notifications for leave request (Employee -> all Admins)
const createLeaveRequestNotification = async (leaveData, io) => {
  try {
    const adminUsers = await User.find({ role: 'admin' });
    const employee = await Employee.findById(leaveData.employeeId).populate('userId', 'name');
    const notifications = [];

    for (const admin of adminUsers) {
      const notificationData = {
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${employee.userId.name} has submitted a new leave request for ${leaveData.leaveType}`,
        recipientId: admin._id,
        senderId: employee.userId._id,
        relatedId: leaveData._id
      };
      notifications.push(await createNotification(notificationData, io));
    }
    return notifications;
  } catch (error) {
    console.error('Error creating leave request notification:', error);
    throw error;
  }
};

// Create notification for leave status update (Admin -> Employee)
const createLeaveStatusNotification = async (leaveData, status, adminId, io) => {
  try {
    const employee = await Employee.findById(leaveData.employeeId).populate('userId');
    const admin = await User.findById(adminId);
    const statusText = status === 'Approved' ? 'approved' : 'rejected';
    const data = {
      type: status === 'Approved' ? 'leave_approved' : 'leave_rejected',
      title: `Leave Request ${status}`,
      message: `Your leave request for ${leaveData.leaveType} has been ${statusText} by ${admin?.name || 'admin'}`,
      recipientId: employee.userId._id,
      senderId: adminId,
      relatedId: leaveData._id
    };
    return await createNotification(data, io);
  } catch (error) {
    console.error('Error creating leave status notification:', error);
    throw error;
  }
};

// Create notifications for an announcement. If `recipients` (array of User ids) is provided,
// target only those users. Otherwise, use announcementData.recipients if present, or all active employees.
const createAnnouncementNotification = async (announcementData, adminId, io, recipients = null) => {
  try {
    let employees = [];
    if (Array.isArray(recipients) && recipients.length) {
      employees = await Employee.find({ userId: { $in: recipients }, status: 'active' }).populate('userId', 'name email role');
    } else if (Array.isArray(announcementData?.recipients) && announcementData.recipients.length) {
      employees = await Employee.find({ userId: { $in: announcementData.recipients }, status: 'active' }).populate('userId', 'name email role');
    } else {
      employees = await Employee.find({ status: 'active' }).populate('userId', 'name email role');
    }

    const created = [];
    for (const emp of employees) {
      if (!emp.userId || !emp.userId._id) continue;
      const data = {
        type: 'announcement',
        title: 'New Announcement',
        message: announcementData?.title || announcementData?.description || 'Announcement',
        senderId: adminId,
        recipientId: emp.userId._id,
        relatedId: announcementData?._id
      };
      created.push(await createNotification(data, io));
    }
    return created;
  } catch (error) {
    console.error('Error creating announcement notifications:', error);
    throw error;
  }
};

// Get notifications for a user with pagination
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const notifications = await Notification.find({ recipientId: userId }).populate('senderId', 'name email').sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit);
    const totalNotifications = await Notification.countDocuments({ recipientId: userId });
    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });
    return res.status(200).json({ success: true, notifications, totalNotifications, unreadCount, currentPage: page, totalPages: Math.ceil(totalNotifications / limit) });
  } catch (err) {
    console.error('getUserNotifications error', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('markAsRead error', err);
    return res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('markAllAsRead error', err);
    return res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
};

// Clear all notifications for a user
const clearAllNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    // Allow clearing only for the authenticated user's own notifications
    const authUserId = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id).toString() : null;
    if (!authUserId || authUserId !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to clear notifications' });
    }

    await Notification.deleteMany({ recipientId: userId });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('clearAllNotifications error', err);
    return res.status(500).json({ success: false, error: 'Failed to clear notifications' });
  }
};

export { createNotification, createLeaveRequestNotification, createLeaveStatusNotification, createAnnouncementNotification, getUserNotifications, markAsRead, markAllAsRead, clearAllNotifications };