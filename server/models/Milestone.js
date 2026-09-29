import mongoose from "mongoose";
import { Schema } from "mongoose";

// A team's weekly goal that groups tasks (like a GitHub milestone).
const milestoneSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date },
    dueDate: { type: Date },
    state: { type: String, enum: ["open", "closed"], default: "open" },
    closedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

milestoneSchema.index({ teamId: 1, state: 1 });

const Milestone = mongoose.model("Milestone", milestoneSchema);
export default Milestone;
