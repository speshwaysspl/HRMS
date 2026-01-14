import mongoose from "mongoose";
 
const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    role: {type: [String], enum: ["admin", "employee", "team_lead"], required: true},
    createAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now},
   
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  fcmTokens: { type: [String], default: [] }
})
 
 
const User = mongoose.model("User", userSchema)
export default User
 