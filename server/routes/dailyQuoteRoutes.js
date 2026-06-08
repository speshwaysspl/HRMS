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

const router = express.Router();

// Public route to get the daily quote
router.get("/", getDailyQuote);

// Protected routes (Admin operations)
router.get("/history", authMiddleware, getDailyQuotesHistory);
router.post("/", authMiddleware, uploadDailyQuote.single("image"), addDailyQuote);
router.delete("/:id", authMiddleware, deleteDailyQuote);
router.delete("/", authMiddleware, deleteAllDailyQuotes);
router.patch("/:id/activate", authMiddleware, activateDailyQuote);
router.patch("/:id/date", authMiddleware, updateDailyQuoteDate);
router.patch("/:id/image", authMiddleware, uploadDailyQuote.single("image"), updateDailyQuoteImage);

export default router;
