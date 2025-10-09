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
 
export default mongoose.model("Attendance", attendanceSchema);  
 

 