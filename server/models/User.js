import mongoose from "mongoose";
 
const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    role: {type: [String], enum: ["admin", "employee", "team_lead", "hr", "candidate"], required: true},
    createAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now},
   
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Forgot-password OTP (hashed; see authController sendResetOtp/verifyResetOtp)
  resetOtpHash: String,
  resetOtpExpire: Date,
  resetOtpSentAt: Date,
  resetOtpAttempts: { type: Number, default: 0 },
  fcmTokens: { type: [String], default: [] }
})

// Never send secrets to clients, however a User ends up in a response
// (populate, find, lean objects excluded). Server code can still read them.
const PRIVATE_FIELDS = ["password", "resetPasswordToken", "resetPasswordExpire", "resetOtpHash",
  "resetOtpExpire", "resetOtpSentAt", "resetOtpAttempts", "fcmTokens"];
const stripPrivate = (_doc, ret) => { PRIVATE_FIELDS.forEach((f) => delete ret[f]); return ret; };
userSchema.set("toJSON", { transform: stripPrivate });

 
// Indexes for the app's hot queries (non-unique: existing duplicates must not block startup).
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema)
export default User
 