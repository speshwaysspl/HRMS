import mongoose from "mongoose";
import { Schema } from "mongoose";

const teamSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, default: Date.now },
  leadId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ 
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    role: { type: String, enum: ['Developer', 'Tester', 'Support', 'Designer', 'Manager'], default: 'Developer' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for faster queries
teamSchema.index({ leadId: 1 });
teamSchema.index({ "members.employeeId": 1 });

const Team = mongoose.model("Team", teamSchema);
export default Team;
