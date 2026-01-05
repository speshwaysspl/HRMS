import express from "express";
import { getDailyQuote, addDailyQuote } from "../controllers/dailyQuoteController.js";
import uploadDailyQuote from "../middleware/uploadDailyQuote.js";
import authMiddleware from "../middleware/authMiddlware.js";

const router = express.Router();

// Public route to get the daily quote
router.get("/", getDailyQuote);

// Protected route to add daily quote (only admin should access ideally, but for now using authMiddleware)
// Assuming authMiddleware checks for valid token. You might want to check for admin role too.
router.post("/", authMiddleware, uploadDailyQuote.single("image"), addDailyQuote);

export default router;
