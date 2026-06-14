import connectToDatabase from "./db/db.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Candidate from "./models/Candidate.js";
import User from "./models/User.js";
import { sendBothOfferAndAppointment } from "./controllers/recruitmentController.js";

async function run() {
  try {
    await connectToDatabase();
    console.log("Connected to MongoDB");

    const saketh = await Candidate.findById("6a2ce5c64728eab453e7b50e");
    if (!saketh) {
      console.error("Saketh not found in database");
      return;
    }

    const hrUser = await User.findOne({ email: "pcharan214@gmail.com" });
    if (!hrUser) {
      console.error("HR user not found");
      return;
    }

    console.log("Invoking sendBothOfferAndAppointment directly...");

    const req = {
      params: { id: saketh._id.toString() },
      user: { _id: hrUser._id },
      body: {
        designation: "Associate Software Engineer",
        department: saketh.department.toString(),
        reportingManager: hrUser._id.toString(),
        salaryPackage: 450000, // 4.5 LPA
        joiningDate: "2026-06-21",
        reportingTime: "09:00",
        workLocation: "Hyderabad",
        probationPeriod: "6 months",
        noticePeriod: "2 months",
        expiryDate: "2026-06-28"
      }
    };

    const res = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log("Response Status:", this.statusCode);
        console.log("Response Data:", JSON.stringify(data, null, 2));
      }
    };

    await sendBothOfferAndAppointment(req, res);

  } catch (err) {
    console.error("Exception caught in script:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
