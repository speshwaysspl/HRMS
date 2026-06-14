import connectToDatabase from "./db/db.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Candidate from "./models/Candidate.js";
import Offer from "./models/Offer.js";
import Appointment from "./models/Appointment.js";
import AuditLog from "./models/AuditLog.js";

async function run() {
  try {
    await connectToDatabase();
    console.log("Connected to MongoDB");

    const sakethId = "6a2ce5c64728eab453e7b50e";

    // Delete Offer
    const offerRes = await Offer.deleteMany({ candidateId: sakethId });
    console.log("Deleted offers:", offerRes);

    // Delete Appointment
    const appRes = await Appointment.deleteMany({ candidateId: sakethId });
    console.log("Deleted appointments:", appRes);

    // Reset Candidate Status
    const candRes = await Candidate.findByIdAndUpdate(sakethId, { status: "Pre-Onboarding" });
    console.log("Reset candidate status for Saketh:", candRes ? "Success" : "Failed");

    // Clean up recent audit logs for send-both
    const logRes = await AuditLog.deleteMany({ candidateId: sakethId, action: "OFFER_AND_APPOINTMENT_SENT" });
    console.log("Deleted audit logs:", logRes);

  } catch (err) {
    console.error("Error resetting Saketh:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
