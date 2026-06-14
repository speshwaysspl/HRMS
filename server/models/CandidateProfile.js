import mongoose from "mongoose";

const candidateProfileSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  personalDetails: {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    dateOfBirth: { type: Date },
    gender: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    nationality: { type: String, default: "" },
    maritalStatus: { type: String, default: "" }
  },
  contactDetails: {
    currentAddress: { type: String, default: "" },
    permanentAddress: { type: String, default: "" },
    emergencyContact: {
      name: { type: String, default: "" },
      relationship: { type: String, default: "" },
      contactNumber: { type: String, default: "" }
    }
  },
  education: {
    degree: { type: String, default: "" },
    college: { type: String, default: "" },
    university: { type: String, default: "" },
    passingYear: { type: Number },
    percentage: { type: Number }
  },
  professionalDetails: {
    experience: { type: String, default: "" },
    currentCompany: { type: String, default: "" },
    currentSalary: { type: Number }
  },
  bankDetails: {
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" }
  },
  nomineeDetails: {
    nomineeName: { type: String, default: "" },
    relationship: { type: String, default: "" },
    contactNumber: { type: String, default: "" }
  },
  completionPercentage: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate completion percentage before saving
candidateProfileSchema.pre("save", function (next) {
  let filledFields = 0;
  const totalFields = 26; // 7 personal + 5 contact + 5 education + 3 professional + 3 bank + 3 nominee

  const personal = this.personalDetails || {};
  if (personal.firstName) filledFields++;
  if (personal.lastName) filledFields++;
  if (personal.dateOfBirth) filledFields++;
  if (personal.gender) filledFields++;
  if (personal.bloodGroup) filledFields++;
  if (personal.nationality) filledFields++;
  if (personal.maritalStatus) filledFields++;

  const contact = this.contactDetails || {};
  if (contact.currentAddress) filledFields++;
  if (contact.permanentAddress) filledFields++;
  const emerg = contact.emergencyContact || {};
  if (emerg.name) filledFields++;
  if (emerg.relationship) filledFields++;
  if (emerg.contactNumber) filledFields++;

  const edu = this.education || {};
  if (edu.degree) filledFields++;
  if (edu.college) filledFields++;
  if (edu.university) filledFields++;
  if (edu.passingYear !== undefined && edu.passingYear !== null && edu.passingYear !== "") filledFields++;
  if (edu.percentage !== undefined && edu.percentage !== null && edu.percentage !== "") filledFields++;

  const prof = this.professionalDetails || {};
  if (prof.experience) filledFields++;
  if (prof.currentCompany) filledFields++;
  if (prof.currentSalary !== undefined && prof.currentSalary !== null && prof.currentSalary !== "") filledFields++;

  const bank = this.bankDetails || {};
  if (bank.bankName) filledFields++;
  if (bank.accountNumber) filledFields++;
  if (bank.ifscCode) filledFields++;

  const nominee = this.nomineeDetails || {};
  if (nominee.nomineeName) filledFields++;
  if (nominee.relationship) filledFields++;
  if (nominee.contactNumber) filledFields++;

  this.completionPercentage = Math.round((filledFields / totalFields) * 100);
  this.updatedAt = Date.now();
  next();
});

const CandidateProfile = mongoose.model("CandidateProfile", candidateProfileSchema);
export default CandidateProfile;
