import express from 'express';
import { 
  processBirthdayWishes, 
  triggerBirthdayWishes, 
  getTodaysBirthdayEmployees 
} from '../services/birthdayService.js';
import verifyUser from '../middleware/authMiddlware.js';

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

export default router;