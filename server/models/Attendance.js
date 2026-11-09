import mongoose from "mongoose";
 
const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: String,
      required: true, // Format: yyyy-mm-ddbduudnddihohoohhoggggg

    },
    inTime: String,
    outTime: String,
    workMode: {
      type: String,
      enum: ["office", "home"],
      default: "office",
    },
    breaks: [
      {
        start: String,
        end: String,
      },
    ],
    inLocation: {
      latitude: Number,
      longitude: Number,
      area: String,
    },
    outLocation: {
      latitude: Number,
      longitude: Number,
      area: String,
    },
  },
  { timestamps: true }
);
 
// Indexes for the app's hot queries (non-unique: existing duplicates must not block startup).
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ date: 1 });

export default mongoose.model("Attendance", attendanceSchema);  
 

 