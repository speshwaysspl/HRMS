import mongoose from "mongoose";

// One row per team task PDF a lead/admin downloads (shown on the admin dashboard).
const teamReportSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", default: null },
    title: { type: String, default: "" }, // milestone heading, e.g. "Week 1"
    taskCount: { type: Number, default: 0 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);
teamReportSchema.index({ createdAt: -1 });

const TeamReport = mongoose.model("TeamReport", teamReportSchema);
export default TeamReport;
