import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Candidate from "../models/Candidate.js";
import bcrypt from "bcrypt";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
 
// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: "User Not Found" });

    // Check if user is a candidate and if their account is active
    if (user.role.includes('candidate')) {
      const candidate = await Candidate.findOne({ userId: user._id });
      // If candidate.isActive is undefined (no field in DB), treat as true
      if (candidate && candidate.isActive === false) {
        return res.status(403).json({ success: false, error: "Account is inactive. Please contact HR." });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, error: "Wrong Password" });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
 
// Verify
const verify = (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
};
 
// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ success: true, message: "If that email exists, a reset link was sent." });

    // Check if user is a candidate and if their account is active
    if (user.role.includes('candidate')) {
      const candidate = await Candidate.findOne({ userId: user._id });
      // If candidate.isActive is undefined (no field in DB), treat as true
      if (candidate && candidate.isActive === false) {
        return res.status(200).json({ success: true, message: "If that email exists, a reset link was sent." });
      }
    }

    // Create reset token (JWT valid for 1 hour)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Save token expiry in DB (optional for tracking)
    user.resetPasswordToken = token;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "https://www.speshwayhrms.com";
    const resetLink = `${clientUrl}/reset-password/${token}`;

    await sendEmail(
      email,
      "Password Reset Request",
      `<p>Click the link to reset your password (valid 1 hour):</p>
       <a href="${resetLink}">${resetLink}</a>`
    );

    res.json({ success: true, message: "If that email exists, a reset link was sent." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.json({ success: true, message: "If that email exists, a reset link was sent." });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params; // ✅ Now read token from URL

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.resetPasswordToken !== token || Date.now() > user.resetPasswordExpire) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    // Check if user is a candidate and if their account is active
    if (user.role.includes('candidate')) {
      const candidate = await Candidate.findOne({ userId: user._id });
      // If candidate.isActive is undefined (no field in DB), treat as true
      if (candidate && candidate.isActive === false) {
        return res.status(403).json({ success: false, error: "Account is inactive. Please contact HR." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined; // invalidate token
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Invalid or expired token" });
  }
};
 
// ---- Forgot password with a 6-digit email OTP ----
// Step 1 sendResetOtp → step 2 verifyResetOtp (returns a short-lived reset
// token) → step 3 the existing resetPassword/:token sets the new password.

const OTP_TTL_MS = 10 * 60 * 1000;      // code valid 10 minutes
const OTP_RESEND_MS = 60 * 1000;        // at most one email per minute
const OTP_MAX_ATTEMPTS = 5;             // wrong tries before a new code is needed
const GENERIC_OTP_MSG = "If an account exists for that email, a 6-digit code has been sent.";

const hashOtp = (otp) => crypto.createHash("sha256").update(`${otp}:${process.env.JWT_SECRET}`).digest("hex");

const findActiveUser = async (email) => {
  const user = await User.findOne({ email: String(email || "").trim().toLowerCase() }) ||
    await User.findOne({ email: String(email || "").trim() });
  if (!user) return null;
  if (user.role.includes("candidate")) {
    const candidate = await Candidate.findOne({ userId: user._id });
    if (candidate && candidate.isActive === false) return null;
  }
  return user;
};

const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await findActiveUser(email);
    // Same reply whether or not the account exists (no account enumeration).
    if (!user) return res.json({ success: true, message: GENERIC_OTP_MSG, resendIn: OTP_RESEND_MS / 1000 });

    if (user.resetOtpSentAt && Date.now() - user.resetOtpSentAt.getTime() < OTP_RESEND_MS) {
      const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - user.resetOtpSentAt.getTime())) / 1000);
      // Don't send again yet; same generic reply so the response doesn't
      // reveal whether the account exists.
      return res.json({ success: true, message: GENERIC_OTP_MSG, resendIn: wait });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpire = new Date(Date.now() + OTP_TTL_MS);
    user.resetOtpSentAt = new Date();
    user.resetOtpAttempts = 0;
    await user.save();

    await sendEmail(
      user.email,
      "Your Speshway HRMS password reset code",
      `<div style="font-family:Arial,sans-serif;max-width:480px">
         <p>Hi ${user.name || ""},</p>
         <p>Use this code to reset your Speshway HRMS password:</p>
         <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${otp}</p>
         <p>The code expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p>
       </div>`
    );

    return res.json({ success: true, message: GENERIC_OTP_MSG, resendIn: OTP_RESEND_MS / 1000 });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({ success: false, message: "Couldn't send the code. Please try again." });
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({ success: false, message: "Enter the 6-digit code" });
    }
    const user = await findActiveUser(email);
    if (!user || !user.resetOtpHash || !user.resetOtpExpire) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }
    if (Date.now() > user.resetOtpExpire.getTime()) {
      return res.status(400).json({ success: false, message: "This code has expired. Request a new one." });
    }
    if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: "Too many wrong attempts. Request a new code." });
    }
    const ok = crypto.timingSafeEqual(Buffer.from(hashOtp(otp)), Buffer.from(user.resetOtpHash));
    if (!ok) {
      user.resetOtpAttempts += 1;
      await user.save();
      const left = OTP_MAX_ATTEMPTS - user.resetOtpAttempts;
      return res.status(400).json({
        success: false,
        message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Request a new code.",
      });
    }

    // Code is single-use; hand back a short-lived token for resetPassword.
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    user.resetOtpHash = undefined;
    user.resetOtpExpire = undefined;
    user.resetOtpAttempts = 0;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    return res.json({ success: true, resetToken });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ success: false, message: "Couldn't verify the code. Please try again." });
  }
};

export { login, verify, forgotPassword, resetPassword, sendResetOtp, verifyResetOtp };