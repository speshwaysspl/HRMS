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

const createHolidayNotification = async (eventData, adminId, io) => {
  try {
    const employees = await Employee.find({ status: 'active' }).populate('userId', 'name email role');
    const created = [];
    for (const emp of employees) {
      if (!emp.userId || !emp.userId._id) continue;
      const message = `${eventData?.title || 'Holiday'} on ${new Date(eventData?.date).toDateString()}`;
      const data = {
        type: 'holiday',
        title: 'New Holiday Added',
        message,
        senderId: adminId,
        recipientId: emp.userId._id,
        relatedId: eventData?._id
      };
      created.push(await createNotification(data, io));
    }
    return created;
  } catch (error) {
    console.error('Error creating holiday notifications:', error);
    throw error;
  }
};

// Create notifications for general events (meeting, event, other)
const createEventNotification = async (eventData, adminId, io) => {
  try {
    // Delegate to holiday-specific builder when type is holiday
    if (eventData?.type === 'holiday') {
      return await createHolidayNotification(eventData, adminId, io);
    }
    const employees = await Employee.find({ status: 'active' }).populate('userId', 'name email role');
    const created = [];
    for (const emp of employees) {
      if (!emp.userId || !emp.userId._id) continue;
      const dateStr = eventData?.date ? new Date(eventData.date).toDateString() : '';
      const isMeeting = eventData?.type === 'meeting';
      const title = isMeeting ? 'New Meeting Scheduled' : 'New Event Added';
      const message = dateStr ? `${eventData?.title || 'Event'} on ${dateStr}` : `${eventData?.title || 'Event'}`;
      const data = {
        // Preserve the event type for client-side handling ('meeting' | 'event' | 'other')
        type: eventData?.type || 'event',
        title,
        message,
        senderId: adminId,
        recipientId: emp.userId._id,
        relatedId: eventData?._id
      };
      created.push(await createNotification(data, io));
    }
    return created;
  } catch (error) {
    console.error('Error creating event notifications:', error);
    throw error;
  }
};

// Create notification for task assignment (Admin/Team Lead -> Employee)
const createTaskAssignmentNotification = async (taskData, assignerId, io) => {
  try {
    // taskData.assignedTo is the Employee ID. We need the User ID.
    const employee = await Employee.findById(taskData.assignedTo).populate('userId');
    if (!employee || !employee.userId) {
        console.error('Employee user not found for task assignment notification');
        return;
    }
    
    const assigner = await User.findById(assignerId);
    
    const data = {
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${taskData.title}" by ${assigner?.name || 'management'}`,
      recipientId: employee.userId._id,
      senderId: assignerId,
      relatedId: taskData._id
    };
    return await createNotification(data, io);
  } catch (error) {
    console.error('Error creating task assignment notification:', error);
    throw error;
  }
};

// Create notification for task update (Admin/Team Lead -> Employee)
const createTaskUpdateNotification = async (taskData, assignerId, io) => {
  try {
    const employee = await Employee.findById(taskData.assignedTo).populate('userId');
    if (!employee || !employee.userId) return;

    const assigner = await User.findById(assignerId);
    
    const data = {
      type: 'task_updated',
      title: 'Task Updated',
      message: `Your task "${taskData.title}" has been updated by ${assigner?.name || 'management'}`,
      recipientId: employee.userId._id,
      senderId: assignerId,
      relatedId: taskData._id
    };
    return await createNotification(data, io);
  } catch (error) {
    console.error('Error creating task update notification:', error);
    throw error;
  }
};

// Create notification for task submission/update (Employee -> Team Lead/Admin)
const createTaskSubmissionNotification = async (taskData, employeeUserId, io) => {
  try {
    const employeeUser = await User.findById(employeeUserId);
    
    // Notify the person who assigned the task (Team Lead or Admin)
    const data = {
      type: 'task_submitted',
      title: 'Task Update',
      message: `${employeeUser?.name || 'Employee'} updated task "${taskData.title}" (Status: ${taskData.status})`,
      recipientId: taskData.assignedBy, // The user ID of who assigned it
      senderId: employeeUserId,
      relatedId: taskData._id
    };
    return await createNotification(data, io);
  } catch (error) {
    console.error('Error creating task submission notification:', error);
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

export { createNotification, createLeaveRequestNotification, createLeaveStatusNotification, createAnnouncementNotification, createHolidayNotification, createEventNotification, createTaskAssignmentNotification, createTaskUpdateNotification, createTaskSubmissionNotification, getUserNotifications, markAsRead, markAllAsRead, clearAllNotifications };
