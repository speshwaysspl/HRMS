import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import connectToDatabase from './db/db.js';
import User from './models/User.js';
import Employee from './models/Employee.js';
import Department from './models/Department.js';

dotenv.config({ quiet: true });

/**
 * Seeds two demo logins for the mobile app:
 *   1. A team lead   (role: ["employee", "team_lead"])
 *   2. A plain employee reporting to that team lead (role: ["employee"])
 * Safe to re-run: it upserts by email and won't duplicate.
 */
const SAMPLES = [
  {
    name: 'Ravi Kumar',
    email: 'teamlead@speshway.test',
    password: 'TeamLead@2026',
    role: ['employee', 'team_lead'],
    employeeId: 'SPL-TL-001',
    designation: 'Team Lead',
    gender: 'Male',
    mobilenumber: '9000000001',
    salaryPackage: 1200000,
  },
  {
    name: 'Anita Sharma',
    email: 'employee@speshway.test',
    password: 'Employee@2026',
    role: ['employee'],
    employeeId: 'SPL-EMP-001',
    designation: 'Software Engineer',
    gender: 'Female',
    mobilenumber: '9000000002',
    salaryPackage: 800000,
    reportsToEmail: 'teamlead@speshway.test',
  },
];

const run = async () => {
  try {
    await connectToDatabase();

    // Ensure a department exists to satisfy Employee.department (required).
    let department = await Department.findOne({ dep_name: 'Engineering' });
    if (!department) {
      department = await Department.create({
        dep_name: 'Engineering',
        description: 'Sample department created by sampleEmployeeSeed.js',
      });
      console.log(`Created department: ${department.dep_name}`);
    }

    for (const s of SAMPLES) {
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

      let reportsTo = null;
      if (s.reportsToEmail) {
        const leadUser = await User.findOne({ email: s.reportsToEmail });
        const leadEmp = leadUser && (await Employee.findOne({ userId: leadUser._id }));
        reportsTo = leadEmp ? leadEmp._id : null;
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
        reportsTo,
      };

      const existingEmp = await Employee.findOne({ userId: user._id });
      if (existingEmp) {
        await Employee.updateOne({ _id: existingEmp._id }, employeeDoc);
        console.log(`Updated employee record: ${s.employeeId}`);
      } else {
        await Employee.create(employeeDoc);
        console.log(`Created employee record: ${s.employeeId}`);
      }
    }

    console.log('\nDone. Credentials:');
    for (const s of SAMPLES) {
      console.log(`  ${s.role.includes('team_lead') ? 'Team Lead' : 'Employee '} | ${s.email} / ${s.password}`);
    }
  } catch (error) {
    console.error('sampleEmployeeSeed error:', error);
  } finally {
    process.exit(0);
  }
};

run();
