import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

// Create and broadcast notification
const createNotification = async (notificationData, io) => {
  try {
    console.log(`📝 Creating notification for recipient: ${notificationData.recipientId}`);
    
    const notification = new Notification(notificationData);
    await notification.save();
    console.log(`💾 Notification saved to database with ID: ${notification._id}`);
    
    // Populate sender and recipient details
    await notification.populate('senderId', 'name email');
    await notification.populate('recipientId', 'name email');
    console.log(`👤 Populated notification - From: ${notification.senderId.name}, To: ${notification.recipientId.name}`);
    
    // Emit to specific user room
    const roomName = `user_${notificationData.recipientId}`;
    console.log(`📡 Emitting notification to room: ${roomName}`);
    io.to(roomName).emit('newNotification', notification);
    console.log(`✅ Notification emitted successfully`);
    
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Create notification for leave request (Employee → Admin)
const createLeaveRequestNotification = async (leaveData, io) => {
  try {
    // Get admin users
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
      
      const notification = await createNotification(notificationData, io);
      notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating leave request notification:', error);
    throw error;
  }
};

// Create notification for leave status update (Admin → Employee)
const createLeaveStatusNotification = async (leaveData, status, adminId, io) => {
  try {
    const employee = await Employee.findById(leaveData.employeeId).populate('userId');
    const admin = await User.findById(adminId);
    
    const statusText = status === 'Approved' ? 'approved' : 'rejected';
    
    const notificationData = {
      type: status === 'Approved' ? 'leave_approved' : 'leave_rejected',
      title: `Leave Request ${status}`,
      message: `Your leave request for ${leaveData.leaveType} has been ${statusText} by ${admin.name}`,
      recipientId: employee.userId._id,
      senderId: adminId,
      relatedId: leaveData._id
    };
    
    const notification = await createNotification(notificationData, io);
    return notification;
  } catch (error) {
    console.error('Error creating leave status notification:', error);
    throw error;
  }
};

// Create notification for announcement (Admin → All Employees)
const createAnnouncementNotification = async (announcementData, adminId, io) => {
  try {
    console.log('🔔 Creating announcement notification...');
    console.log('📢 Announcement data:', announcementData);
    console.log('👤 Admin ID:', adminId);

    console.log('🔍 Querying employees for notifications...');
    
    // Get all active employees
    const employees = await Employee.find({}).populate('userId', 'name email role');
    
    console.log(`📊 Found ${employees.length} employees for notifications`);
    
    if (employees.length === 0) {
      console.log('⚠️ No employees found for notifications');
      return;
    }

    // Get admin details
    const admin = await User.findById(adminId);
    console.log('👨‍💼 Admin details:', admin?.name);

    // Create notification for each employee
    for (const employee of employees) {
      if (employee.userId && employee.userId._id) {
        console.log(`📤 Creating notification for employee: ${employee.userId?.name} (${employee.userId?._id})`);
        
        const notificationData = {
          type: 'announcement',
          title: 'New Announcement',
          message: announcementData.title,
          senderId: adminId,
          recipientId: employee.userId._id
        };
        
        // Only add relatedId if it's a valid ObjectId
        if (announcementData._id && announcementData._id.toString().length === 24) {
          notificationData.relatedId = announcementData._id;
        }
        
        await createNotification(notificationData, io);
      } else {
        console.log(`⚠️ Skipping employee with missing userId:`, employee.employeeId);
      }
    }
  } catch (error) {
    console.error('❌ Error creating announcement notification:', error);
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const notifications = await Notification.find({ recipientId: userId })
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalNotifications = await Notification.countDocuments({ recipientId: userId });
    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });
    
    return res.status(200).json({
      success: true,
      notifications,
      totalNotifications,
      unreadCount,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read for a user
const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true }
    );
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
};

export {
  createNotification,
  createLeaveRequestNotification,
  createLeaveStatusNotification,
  createAnnouncementNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};