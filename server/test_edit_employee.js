import axios from "axios";
import mongoose from "mongoose";
import User from "./models/User.js";
import Employee from "./models/Employee.js";
import connectToDatabase from "./db/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import Department from "./models/Department.js";

dotenv.config();

const API_URL = "http://localhost:5000/api";

const runTest = async () => {
  try {
    await connectToDatabase();
    console.log('Connected to DB');

    // 0. Get a valid Department
    let dep = await Department.findOne();
    if (!dep) {
        dep = new Department({ dep_name: 'Test Dep', description: 'Test Desc' });
        await dep.save();
    }
    console.log('Using Department:', dep._id);

    // 1. Login as Admin
    console.log('Logging in as Admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'speshwaysspl@gmail.com',
      password: 'speshway@2017'
    });

    if (!loginRes.data.success) {
      throw new Error('Admin login failed');
    }
    const token = loginRes.data.token;
    console.log('Admin logged in successfully');

    // 2. Create a temporary user/employee directly in DB to test update
    // (Skipping full create API call to save time, inserting directly)
    const testEmail = 'test_update_user@example.com';
    const testPassword = 'initialPassword123';
    const hashedPwd = await bcrypt.hash(testPassword, 10);
    
    // Clean up if exists
    await User.deleteMany({ email: testEmail });
    await Employee.deleteMany({ employeeId: 'TEST999' });

    const newUser = new User({
      name: 'Test Update User',
      email: testEmail,
      password: hashedPwd,
      role: ['employee']
    });
    const savedUser = await newUser.save();
    console.log('Temporary user created');

    const newEmployee = new Employee({
      userId: savedUser._id,
      employeeId: 'TEST999',
      dob: new Date(),
      joiningDate: new Date(),
      gender: 'male',
      mobilenumber: '1234567890',
      designation: 'Tester',
      department: dep._id
    });
    const savedEmployee = await newEmployee.save();
    console.log('Temporary employee created');

    // 3. Call Update API to change Role and Password
    console.log('Calling Update API...');
    const newRole = ['employee', 'team_lead'];
    const newPassword = 'newPassword456';

    try {
      const updateRes = await axios.put(
        `${API_URL}/employee/${savedEmployee._id}`,
        {
          name: 'Test Update User Updated',
          email: testEmail,
          employeeId: 'TEST999',
          role: newRole,
          password: newPassword,
          // other required fields
          mobilenumber: '1234567890',
          designation: 'Tester Updated',
          gender: 'male'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('Update response:', updateRes.data);
      if (updateRes.data.updatedUser) {
          console.log('Server returned updated user:', updateRes.data.updatedUser);
      }
    } catch (e) {
      console.error('Update failed:', e.response ? e.response.data : e.message);
      throw e;
    }

    // 4. Verify updates in DB
    const updatedUser = await User.findById(savedUser._id);
    console.log('Updated User Role:', updatedUser.role);
    
    const isRoleUpdated = JSON.stringify(updatedUser.role) === JSON.stringify(newRole);
    const isPasswordUpdated = await bcrypt.compare(newPassword, updatedUser.password);

    if (isRoleUpdated && isPasswordUpdated) {
      console.log('✅ SUCCESS: Role and Password updated successfully!');
    } else {
      console.error('❌ FAILURE: Update verification failed.');
      console.log('Role Match:', isRoleUpdated);
      console.log('Password Match:', isPasswordUpdated);
    }

    // Cleanup
    await User.findByIdAndDelete(savedUser._id);
    await Employee.findByIdAndDelete(savedEmployee._id);
    console.log('Cleanup done');

  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    process.exit(0);
  }
};

runTest();
