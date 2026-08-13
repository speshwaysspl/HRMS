import mongoose from "mongoose";
import { Schema } from "mongoose";

const shiftSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    startTime: { type: String, required: true }, // HH:MM, 24h
    endTime: { type: String, required: true }, // HH:MM, 24h
  },
  { timestamps: true }
);

const Shift = mongoose.model("Shift", shiftSchema);
export default Shift;
