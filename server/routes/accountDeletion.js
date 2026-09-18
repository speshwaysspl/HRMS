import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import verifyUser from "../middleware/authMiddlware.js";
import {
  requestAccountDeletion,
  getAccountDeletionRequests
} from "../controllers/accountDeletionController.js";

const router = express.Router();

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded._id || decoded.id;
        const user = await User.findById(userId).select("-password");
        if (user) {
          req.user = user;
        }
      }
    }
  } catch (_) {
    // Ignore invalid/expired token for public submission
  }
  next();
};

const requireAdminOrHr = (req, res, next) => {
  if (
    !req.user ||
    (!req.user.role.includes("admin") && !req.user.role.includes("hr"))
  ) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin or HR privileges required."
    });
  }
  next();
};

// POST /api/account/deletion-request (both mobile app/web and public URL)
router.post("/deletion-request", optionalAuth, requestAccountDeletion);

// GET /api/account/deletion-requests (Admin and HR only)
router.get("/deletion-requests", verifyUser, requireAdminOrHr, getAccountDeletionRequests);

export default router;
