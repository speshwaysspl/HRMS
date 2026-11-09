import express from "express";
import verifyUser from "../middleware/authMiddlware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { linkResolveLimiter } from "../middleware/rateLimit.js";
import {
  createShortLink,
  listShortLinks,
  updateShortLink,
  deleteShortLink,
  resolveShortLink,
} from "../controllers/shortLinkController.js";

const router = express.Router();
const adminOrHr = authorizeRoles("admin", "hr");

// Public: resolve a code (rate limited against code guessing).
router.get("/resolve/:code", linkResolveLimiter, resolveShortLink);

// Management: admin/HR only.
router.get("/", verifyUser, adminOrHr, listShortLinks);
router.post("/", verifyUser, adminOrHr, createShortLink);
router.patch("/:id", verifyUser, adminOrHr, updateShortLink);
router.delete("/:id", verifyUser, adminOrHr, deleteShortLink);

export default router;
