// backend/models/Announcement.jsjbsbssjbsks
import mongoose from "mongoose";
const { Schema } = mongoose;

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // scope: 'all' means send to all employees, 'specific' means use recipients list
    scope: { type: String, enum: ["all", "specific"], default: "all" },
    // recipients: optional list of User ObjectIds (targeted users) when scope is 'specific'
    recipients: [{ type: Schema.Types.ObjectId, ref: "User" }],
    image: { type: String, default: null }, // S3 URL
    imageKey: { type: String, default: null }, // S3 object key for deletion
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
