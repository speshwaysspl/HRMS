import Feedback from "../models/Feedback.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import { createNotification } from "./notificationController.js";

// Create new feedback (Employee)
const createFeedback = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      priority,
      isAnonymous,
      tags,
      rating
    } = req.body;

    // Get employee ID from the authenticated user
    const employee = await Employee.findOne({ userId: req.user.id });
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: "Employee profile not found" 
      });
    }

    const newFeedback = new Feedback({
      employeeId: employee._id,
      title,
      category,
      description,
      priority: priority || "Medium",
      isAnonymous: isAnonymous || false,
      tags: tags || [],
      rating
    });

    const savedFeedback = await newFeedback.save();
    
    // Populate employee details for response
    await savedFeedback.populate({
      path: 'employeeId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
    });

    // Send notification to all admins about new feedback submission
    try {
      const adminUsers = await User.find({ role: 'admin' });
      const employeeName = isAnonymous ? 'Anonymous Employee' : savedFeedback.employeeId.userId.name;
      
      for (const admin of adminUsers) {
        await createNotification({
          type: 'feedback_submitted',
          title: 'New Feedback Submitted',
          message: `Employee ${employeeName} submitted new feedback.`,
          recipientId: admin._id,
          senderId: req.user.id,
          relatedId: savedFeedback._id
        }, req.io);
      }
    } catch (notificationError) {
      console.error('Error sending feedback submission notification:', notificationError);
      // Don't fail the feedback creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: savedFeedback
    });
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit feedback"
    });
  }
};

// Get employee's own feedback
const getEmployeeFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    
    // Get employee ID from the authenticated user
    const employee = await Employee.findOne({ userId: req.user.id });
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: "Employee profile not found" 
      });
    }

    // Build query
    const query = { employeeId: employee._id };
    if (status) query.status = status;
    if (category) query.category = category;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: {
        path: 'adminResponse.respondedBy',
        select: 'name email'
      }
    };

    const feedbacks = await Feedback.find(query)
      .populate(options.populate)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Feedback.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: options.page,
          totalPages: Math.ceil(total / options.limit),
          totalItems: total,
          itemsPerPage: options.limit
        }
      }
    });
  } catch (error) {
    console.error("Error fetching employee feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch feedback"
    });
  }
};

// Get all feedback (Admin only)
const getAllFeedback = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `^${escaped}$`;
      const users = await User.find({ name: { $regex: pattern, $options: 'i' } }, { _id: 1 });
      const employees = await Employee.find({ userId: { $in: users.map(u => u._id) } }, { _id: 1 });
      const employeeIds = employees.map(e => e._id);
      query.employeeId = { $in: employeeIds };
      query.isAnonymous = false;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const feedbacks = await Feedback.find(query)
      .populate({
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate({
        path: 'adminResponse.respondedBy',
        select: 'name email'
      })
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Feedback.countDocuments(query);

    // Get statistics
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = {
      Pending: 0,
      'Under Review': 0,
      Resolved: 0,
      Closed: 0
    };

    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        statistics: statusStats
      }
    });
  } catch (error) {
    console.error("Error fetching all feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch feedback"
    });
  }
};

// Get feedback by ID
const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const feedback = await Feedback.findById(id)
      .populate({
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate({
        path: 'adminResponse.respondedBy',
        select: 'name email'
      });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: "Feedback not found"
      });
    }

    // Check if user has permission to view this feedback
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user.id });
      if (!employee || !feedback.employeeId.equals(employee._id)) {
        return res.status(403).json({
          success: false,
          error: "Access denied"
        });
      }
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error("Error fetching feedback by ID:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch feedback"
    });
  }
};

// Update feedback status and add admin response (Admin only)
const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: "Feedback not found"
      });
    }

    // Update status if provided
    if (status) {
      feedback.status = status;
    }

    // Add admin response if provided
    if (adminResponse) {
      feedback.adminResponse = {
        message: adminResponse,
        respondedBy: req.user.id,
        respondedAt: new Date()
      };
    }

    const updatedFeedback = await feedback.save();
    
    // Populate for response
    await updatedFeedback.populate([
      {
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      },
      {
        path: 'adminResponse.respondedBy',
        select: 'name email'
      }
    ]);

    // Send notification to employee when admin responds or updates status
    try {
      if (adminResponse || status) {
        const employeeUserId = updatedFeedback.employeeId.userId._id;
        
        await createNotification({
          type: 'feedback_response',
          title: 'Feedback Update',
          message: 'Your feedback has been reviewed/replied.',
          recipientId: employeeUserId,
          senderId: req.user.id,
          relatedId: updatedFeedback._id
        }, req.io);
      }
    } catch (notificationError) {
      console.error('Error sending feedback response notification:', notificationError);
      // Don't fail the feedback update if notification fails
    }

    res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
      data: updatedFeedback
    });
  } catch (error) {
    console.error("Error updating feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update feedback"
    });
  }
};

// Update employee's own feedback (only if status is Pending)
const updateEmployeeFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, priority, tags, rating } = req.body;

    // Get employee ID from the authenticated user
    const employee = await Employee.findOne({ userId: req.user.id });
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: "Employee profile not found" 
      });
    }

    const feedback = await Feedback.findOne({ 
      _id: id, 
      employeeId: employee._id 
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: "Feedback not found"
      });
    }

    // Only allow updates if status is Pending
    if (feedback.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: "Cannot update feedback that is already under review or resolved"
      });
    }

    // Update fields
    if (title) feedback.title = title;
    if (category) feedback.category = category;
    if (description) feedback.description = description;
    if (priority) feedback.priority = priority;
    if (tags) feedback.tags = tags;
    if (rating) feedback.rating = rating;

    const updatedFeedback = await feedback.save();

    res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
      data: updatedFeedback
    });
  } catch (error) {
    console.error("Error updating employee feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update feedback"
    });
  }
};

// Delete feedback (Employee can delete only pending feedback, Admin can delete any)
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    let feedback;
    
    if (req.user.role === 'admin') {
      feedback = await Feedback.findById(id);
    } else {
      // Employee can only delete their own pending feedback
      const employee = await Employee.findOne({ userId: req.user.id });
      if (!employee) {
        return res.status(404).json({ 
          success: false, 
          error: "Employee profile not found" 
        });
      }

      feedback = await Feedback.findOne({ 
        _id: id, 
        employeeId: employee._id,
        status: 'Pending'
      });
    }

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: "Feedback not found or cannot be deleted"
      });
    }

    await Feedback.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Feedback deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete feedback"
    });
  }
};

// Get feedback statistics (Admin only)
const getFeedbackStatistics = async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          underReviewCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Under Review'] }, 1, 0] }
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          closedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] }
          },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    const categoryStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const priorityStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalFeedback: 0,
          pendingCount: 0,
          underReviewCount: 0,
          resolvedCount: 0,
          closedCount: 0,
          averageRating: 0
        },
        categoryBreakdown: categoryStats,
        priorityBreakdown: priorityStats
      }
    });
  } catch (error) {
    console.error("Error fetching feedback statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
};

export {
  createFeedback,
  getEmployeeFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  updateEmployeeFeedback,
  deleteFeedback,
  getFeedbackStatistics
};