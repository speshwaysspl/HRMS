// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Candidate from "../models/Candidate.js";

const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Authorization token missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      // Login sessions don't expire (they end on logout), so older login
      // tokens issued with a 7-day expiry are still honoured. Other tokens
      // signed with this secret (e.g. password reset, payload { id }) keep
      // their expiry.
      decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
      // Only login tokens ({ _id, role }) open a session. Password-reset and
      // email-action tokens are signed with the same secret but must never be
      // usable as a login.
      const isLoginToken = !!decoded._id && !!decoded.role;
      if (!isLoginToken) {
        return res.status(401).json({ success: false, error: "Invalid token" });
      }
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, error: "Token expired" });
      }
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Accept both decoded._id and decoded.id for compatibility with different token issuers
    const userId = decoded._id || decoded.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if user is a candidate and if their account is active
    if (user.role.includes('candidate')) {
      const candidate = await Candidate.findOne({ userId: user._id });
      // If candidate.isActive is undefined (no field in DB), treat as true
      if (candidate && candidate.isActive === false) {
        return res.status(403).json({ success: false, error: "Account is inactive. Please contact HR." });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export default verifyUser;
