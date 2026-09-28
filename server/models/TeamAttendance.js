import mongoose from "mongoose";
import { Schema } from "mongoose";

// Manual daily roll-call a team lead keeps for their team.
// Independent of the punch-in Attendance collection.
const teamAttendanceSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    present: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    absent: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

teamAttendanceSchema.index({ teamId: 1, date: 1 }, { unique: true });

const TeamAttendance = mongoose.model("TeamAttendance", teamAttendanceSchema);
export default TeamAttendance;
