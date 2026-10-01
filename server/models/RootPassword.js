import mongoose from "mongoose";

// Single document: the admin-set "root" password (bcrypt hash) that, with an
// employee's email, signs in as that employee. Every such sign-in is logged.
const rootPasswordSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    logins: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        email: String,
        ip: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const RootPassword = mongoose.model("RootPassword", rootPasswordSchema);
export default RootPassword;
