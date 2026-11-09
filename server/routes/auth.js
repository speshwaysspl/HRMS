// routes/auth.js
import express from "express";
import {
  login,
  verify,
  forgotPassword,
  resetPassword,
  sendResetOtp,
  verifyResetOtp,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddlware.js";
import { loginLimiter, passwordResetLimiter } from "../middleware/rateLimit.js";

const router = express.Router();


router.post("/login", loginLimiter, login);
router.get("/verify", authMiddleware, verify);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/forgot-password/otp", passwordResetLimiter, sendResetOtp);
router.post("/forgot-password/verify-otp", passwordResetLimiter, verifyResetOtp);
router.post("/reset-password/:token", passwordResetLimiter, resetPassword);

export default router;
