import express from 'express';
import { 
  processBirthdayWishes, 
  triggerBirthdayWishes, 
  getTodaysBirthdayEmployees 
} from '../services/birthdayService.js';
import verifyUser from '../middleware/authMiddlware.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../controllers/notificationController.js';
import { toISTDateString } from '../utils/dateTimeUtils.js';

const router = express.Router();

/**
 * GET /api/birthdays/today
 * Get employees with birthdays today
 */
router.get('/today', verifyUser, async (req, res) => {
  try {
    const result = await getTodaysBirthdayEmployees();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Found ${result.count} birthday(s) today`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in /birthdays/today:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/birthdays/trigger
 * Manually trigger birthday wishes process
 * Only accessible by admin users
 */
router.post('/trigger', verifyUser, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const result = await triggerBirthdayWishes();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Birthday wishes process completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in /birthdays/trigger:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/birthdays/status
 * Get birthday service status and statistics
 */
router.get('/status', verifyUser, async (req, res) => {
  try {
    const todaysResult = await getTodaysBirthdayEmployees();
    
    res.status(200).json({
      success: true,
      message: 'Birthday service status',
      data: {
        serviceActive: true,
        todaysBirthdays: todaysResult.count,
        employees: todaysResult.employees,
        lastChecked: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in /birthdays/status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// IST calendar day (MM-DD) of a stored date. DOB/joining dates are saved as
// midnight UTC of the picked day, so read their UTC month/day.
const monthDay = (d) => (d ? new Date(d).toISOString().slice(5, 10) : null);

// Start of today in IST, as a UTC Date — for "already wished today" checks.
const istDayStart = () => new Date(`${toISTDateString(new Date())}T00:00:00+05:30`);

/**
 * GET /api/birthdays/celebrations
 * Today's birthdays and work anniversaries (active employees), with whether
 * the current user has already sent a wish today.
 */
router.get('/celebrations', verifyUser, async (req, res) => {
  try {
    const today = toISTDateString(new Date());
    const md = today.slice(5);
    const year = Number(today.slice(0, 4));
    const employees = await Employee.find({ status: 'active' })
      .select('userId dob joiningDate designation')
      .populate('userId', 'name');

    const wished = new Set(
      (await Notification.find({
        type: 'birthday_wish',
        senderId: req.user._id,
        createdAt: { $gte: istDayStart() },
      }).select('recipientId')).map((n) => n.recipientId.toString())
    );

    const birthdays = [];
    const anniversaries = [];
    for (const e of employees) {
      if (!e.userId) continue;
      const base = {
        userId: e.userId._id,
        name: e.userId.name,
        designation: e.designation || '',
        isMe: e.userId._id.toString() === req.user._id.toString(),
        wished: wished.has(e.userId._id.toString()),
      };
      if (monthDay(e.dob) === md) birthdays.push(base);
      if (e.joiningDate && monthDay(e.joiningDate) === md) {
        const years = year - new Date(e.joiningDate).getUTCFullYear();
        if (years >= 1) anniversaries.push({ ...base, years });
      }
    }
    return res.status(200).json({ success: true, birthdays, anniversaries });
  } catch (error) {
    console.error('Error in /birthdays/celebrations:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/birthdays/wish/:userId   body: { kind: 'birthday' | 'anniversary' }
 * Sends a one-tap wish (in-app + push) to a colleague. Once per person per day.
 */
router.post('/wish/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You can't wish yourself" });
    }
    const target = await Employee.findOne({ userId, status: 'active' }).select('_id');
    if (!target) return res.status(404).json({ success: false, message: 'Colleague not found' });

    const already = await Notification.findOne({
      type: 'birthday_wish',
      senderId: req.user._id,
      recipientId: userId,
      createdAt: { $gte: istDayStart() },
    });
    if (already) return res.status(200).json({ success: true, alreadySent: true });

    const anniversary = req.body?.kind === 'anniversary';
    await createNotification({
      type: 'birthday_wish',
      title: anniversary ? 'Happy Work Anniversary! 🎉' : 'Happy Birthday! 🎂',
      message: `${req.user.name || 'A colleague'} wished you a happy ${anniversary ? 'work anniversary' : 'birthday'}!`,
      recipientId: userId,
      senderId: req.user._id,
    }, req.app.get('io'));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in /birthdays/wish:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;