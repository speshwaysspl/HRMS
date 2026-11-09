import express from "express";
import { 
  getDailyQuote, 
  addDailyQuote, 
  getDailyQuotesHistory, 
  deleteDailyQuote, 
  activateDailyQuote,
  deleteAllDailyQuotes,
  updateDailyQuoteDate,
  updateDailyQuoteImage
} from "../controllers/dailyQuoteController.js";
import uploadDailyQuote from "../middleware/uploadDailyQuote.js";
import authMiddleware from "../middleware/authMiddlware.js";
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();
const adminOrHr = authorizeRoles('admin', 'hr');

// Public route to get the daily quote
router.get("/", getDailyQuote);

// Protected routes (Admin operations)
router.get("/history", authMiddleware, adminOrHr, getDailyQuotesHistory);
router.post("/", authMiddleware, adminOrHr, uploadDailyQuote.single("image"), addDailyQuote);
router.delete("/:id", authMiddleware, adminOrHr, deleteDailyQuote);
router.delete("/", authMiddleware, adminOrHr, deleteAllDailyQuotes);
router.patch("/:id/activate", authMiddleware, adminOrHr, activateDailyQuote);
router.patch("/:id/date", authMiddleware, adminOrHr, updateDailyQuoteDate);
router.patch("/:id/image", authMiddleware, adminOrHr, uploadDailyQuote.single("image"), updateDailyQuoteImage);

export default router;
