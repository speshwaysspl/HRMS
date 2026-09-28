import mongoose from "mongoose";
import { Schema } from "mongoose";

const taskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  startDate: { type: Date },
  deadline: { type: Date },
  assignedTo: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  status: { type: String, enum: ["Assigned", "In Progress", "Review", "Completed", "Overdue", "Not Completed"], default: "Assigned" },
  comments: { type: String },
  workProof: { type: String }, // URL to uploaded file
  remark: { type: String }, // Team lead / admin review note (separate from description)
  rating: { type: Number, min: 1, max: 5 }, // Team lead / admin rating of the work
  isDeleted: { type: Boolean, default: false }, // Soft delete flag
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for faster queries
taskSchema.index({ teamId: 1 });
taskSchema.index({ assignedTo: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;
