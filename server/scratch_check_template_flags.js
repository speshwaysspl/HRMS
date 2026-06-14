import connectToDatabase from "./db/db.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import Employee from "./models/Employee.js";
import PayrollTemplate from "./models/PayrollTemplate.js";

async function checkTemplateFlags() {
  try {
    await connectToDatabase();
    const employee = await Employee.findOne({ employeeId: "EMP002" });
    if (!employee) {
      console.log("Employee EMP002 not found!");
      return;
    }

    const templates = await PayrollTemplate.find({ employeeId: employee._id });
    console.log(`Found ${templates.length} templates:`);
    for (const t of templates) {
      console.log(`- Template Name: ${t.templateName}`);
      console.log(`  _id: ${t._id}`);
      console.log(`  isDefault: ${t.isDefault}`);
      console.log(`  isActive: ${t.isActive}`);
      console.log(`  bankname: ${t.bankname}`);
      console.log(`  bankaccountnumber: ${t.bankaccountnumber}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkTemplateFlags();
