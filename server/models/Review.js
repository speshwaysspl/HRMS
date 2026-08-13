import mongoose from "mongoose";
import { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    cycle: { type: String, required: true }, // e.g. "Q1 2026"
    ratings: [
      {
        competency: { type: String, required: true },
        score: { type: Number, required: true, min: 1, max: 5 },
      },
    ],
    overallRating: { type: Number, min: 1, max: 5 },
    managerComments: { type: String },
    selfComments: { type: String },
    status: { type: String, enum: ["Draft", "Submitted", "Acknowledged"], default: "Draft" },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
