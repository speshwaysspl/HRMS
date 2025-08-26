// routes/auth.js
import express from "express";
import {
  login,
  verify,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddlware.js";

const router = express.Router();


router.post("/login", login);
router.get("/verify", authMiddleware, verify);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
