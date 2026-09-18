// backend/models/Announcement.jsjbsbssjbsks
import mongoose from "mongoose";
const { Schema } = mongoose;

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // category: 'important', 'quote', 'festival', 'event', 'achievement', 'general'
    category: {
      type: String,
      enum: ["important", "quote", "festival", "event", "achievement", "general"],
      default: "important"
    },
    // scope: 'all', 'specific', 'team_leads', 'team_members', 'team'
    scope: { 
      type: String, 
      enum: ["all", "specific", "team_leads", "team_members", "team"], 
      default: "all" 
    },
    // targetTeam: optional reference to Team when scope is 'team'
    targetTeam: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    // recipients: optional list of User ObjectIds (targeted users) when scope is not 'all'
    recipients: [{ type: Schema.Types.ObjectId, ref: "User" }],
    image: { type: String, default: null }, // S3 URL
    imageKey: { type: String, default: null }, // S3 object key for deletion
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
