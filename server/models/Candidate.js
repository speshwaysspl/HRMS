import mongoose from "mongoose";
const { Schema } = mongoose;

const candidateSchema = new Schema({
  candidateId: { type: String, required: true, unique: true },
  tempEmployeeId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true },
  position: { type: String, required: true },
  department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
  expectedJoiningDate: { type: Date },
  experience: { type: String },
  currentCompany: { type: String },
  resumeUrl: { type: String },
  resumeKey: { type: String },
  interviewDate: { type: Date },
  zoomMeetingLink: { type: String },
  
  status: {
    type: String,
    enum: [
      "Applied",
      "Screening",
      "Interview Scheduled",
      "Interview Completed",
      "Selected",
      "Pre-Onboarding",
      "Offer Sent",
      "Offer Accepted",
      "Appointment Sent",
      "Appointment Accepted",
      "Employee Created"
    ],
    default: "Applied"
  },
  
  isActive: { type: Boolean, default: true },

  personalInfo: {
    firstName: { type: String },
    lastName: { type: String },
    dob: { type: Date },
    gender: { type: String },
    bloodGroup: { type: String },
    nationality: { type: String },
    maritalStatus: { type: String }
  },

  contactInfo: {
    currentAddress: { type: String },
    permanentAddress: { type: String },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String }
    }
  },

  educationDetails: [
    {
      degree: { type: String },
      college: { type: String },
      university: { type: String },
      passingYear: { type: Number },
      percentage: { type: Number }
    }
  ],

  professionalDetails: {
    experience: { type: String },
    currentCompany: { type: String },
    currentSalary: { type: Number }
  },

  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String }
  },

  nomineeDetails: {
    nomineeName: { type: String },
    relationship: { type: String },
    contactNumber: { type: String }
  },

  profileCompletionPercentage: { type: Number, default: 0 },
  firstLoginChangePassword: { type: Boolean, default: false },

  notes: [
    {
      note: { type: String, required: true },
      date: { type: Date, default: Date.now },
      addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
    }
  ],

  activityTimeline: [
    {
      activity: { type: String, required: true },
      date: { type: Date, default: Date.now },
      performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
    }
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Candidate = mongoose.model("Candidate", candidateSchema);
export default Candidate;
