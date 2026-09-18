import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import connectToDatabase from './db/db.js';
import User from './models/User.js';
import Employee from './models/Employee.js';
import Department from './models/Department.js';

dotenv.config({ quiet: true });

/**
 * Seeds a single, stable login used for Google Play "App access" reviewer
 * credentials and general app-store/store-listing verification. Kept
 * separate from sampleEmployeeSeed.js so it isn't accidentally removed or
 * changed when demo data is reworked. Safe to re-run: upserts by email.
 */
const VERIFICATION_ACCOUNT = {
  name: 'App Verification',
  email: 'verification@gmail.com',
  password: 'verify@123',
  role: ['employee'],
  employeeId: 'SPL-VERIFY-001',
  designation: 'App Reviewer',
  gender: 'Other',
  mobilenumber: '9000000099',
  salaryPackage: 600000,
};

const run = async () => {
  try {
    await connectToDatabase();

    let department = await Department.findOne({ dep_name: 'Engineering' });
    if (!department) {
      department = await Department.create({
        dep_name: 'Engineering',
        description: 'Sample department created by verificationSeed.js',
      });
      console.log(`Created department: ${department.dep_name}`);
    }

    const s = VERIFICATION_ACCOUNT;
    let user = await User.findOne({ email: s.email });
    const hashPassword = await bcrypt.hash(s.password, 10);
    if (user) {
      user.name = s.name;
      user.role = s.role;
      user.password = hashPassword;
      await user.save();
      console.log(`Updated user: ${s.email}`);
    } else {
      user = await User.create({
        name: s.name,
        email: s.email,
        password: hashPassword,
        role: s.role,
      });
      console.log(`Created user: ${s.email}`);
    }

    const employeeDoc = {
      userId: user._id,
      employeeId: s.employeeId,
      department: department._id,
      designation: s.designation,
      gender: s.gender,
      mobilenumber: s.mobilenumber,
      joiningDate: new Date(),
      status: 'active',
      salaryPackage: s.salaryPackage,
    };

    const existingEmp = await Employee.findOne({ userId: user._id });
    if (existingEmp) {
      await Employee.updateOne({ _id: existingEmp._id }, employeeDoc);
      console.log(`Updated employee record: ${s.employeeId}`);
    } else {
      await Employee.create(employeeDoc);
      console.log(`Created employee record: ${s.employeeId}`);
    }

    console.log('\nDone. Verification credentials:');
    console.log(`  ${s.email} / ${s.password}`);
  } catch (error) {
    console.error('verificationSeed error:', error);
  } finally {
    process.exit(0);
  }
};

run();
