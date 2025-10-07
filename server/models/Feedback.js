import mongoose from "mongoose";
import { Schema } from "mongoose";

const feedbackSchema = new Schema({
  employeeId: { 
    type: Schema.Types.ObjectId, 
    ref: "Employee", 
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      "General", 
      "Work Environment", 
      "Management", 
      "Benefits", 
      "Training", 
      "Technology", 
      "Suggestion", 
      "Complaint",
      "Other"
    ]
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 2000
  },
  priority: { 
    type: String, 
    enum: ["Low", "Medium", "High"], 
    default: "Medium",
    required: false
  },
  status: { 
    type: String, 
    enum: ["Pending", "Under Review", "Resolved", "Closed"], 
    default: "Pending" 
  },
  isAnonymous: { 
    type: Boolean, 
    default: false 
  },
  adminResponse: {
    message: { 
      type: String, 
      trim: true,
      maxlength: 1000
    },
    respondedBy: { 
      type: Schema.Types.ObjectId, 
      ref: "User" 
    },
    respondedAt: { 
      type: Date 
    }
  },
  tags: [{ 
    type: String, 
    trim: true 
  }],
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for better query performance
feedbackSchema.index({ employeeId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, createdAt: -1 });

// Update the updatedAt field before saving
feedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for feedback age in days
feedbackSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;