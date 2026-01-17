import jwt from "jsonwebtoken";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/sendEmail.js";
 
// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: "User Not Found" });
 
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
      user: { _id: user._id, name: user.name, role: user.role }
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
 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
 
    const user = await User.findById(decoded.id);
    if (!user || user.resetPasswordToken !== token || Date.now() > user.resetPasswordExpire) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
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
 
export { login, verify, forgotPassword, resetPassword };
