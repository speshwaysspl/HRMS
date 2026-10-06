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
  milestoneId: { type: Schema.Types.ObjectId, ref: "Milestone" }, // optional weekly milestone
  status: { type: String, enum: ["Assigned", "In Progress", "Review", "Completed", "Overdue", "Not Completed"], default: "Assigned" },
  comments: { type: String },
  reference: { type: String }, // Optional file/image from the lead showing what to do
  referenceName: { type: String },
  workProof: { type: String }, // URL to uploaded file
  workProofName: { type: String }, // original file name, for display
  // All work-proof files (up to 10). workProof/workProofName mirror the first one
  // so older clients and single-file views keep working.
  workProofs: [{ _id: false, url: { type: String, required: true }, name: { type: String } }],
  remark: { type: String }, // Team lead / admin review note (separate from description)
  rating: { type: Number, min: 1, max: 10 }, // Team lead / admin rating of the work
  isDeleted: { type: Boolean, default: false }, // Soft delete flag
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Tasks saved before multi-upload only have workProof; expose it as a one-item list.
const withProofList = (_doc, ret) => {
  if ((!ret.workProofs || ret.workProofs.length === 0) && ret.workProof) {
    ret.workProofs = [{ url: ret.workProof, name: ret.workProofName }];
  }
  return ret;
};
taskSchema.set("toJSON", { transform: withProofList });
taskSchema.set("toObject", { transform: withProofList });

// Indexes for faster queries
taskSchema.index({ teamId: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ milestoneId: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;
