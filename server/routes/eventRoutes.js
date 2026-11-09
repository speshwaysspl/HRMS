import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import { cacheShared } from '../middleware/cache.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  seedHolidays,
} from "../controllers/eventController.js";

const router = express.Router();
const adminOrHr = authorizeRoles('admin', 'hr');

router.get("/", authMiddleware, cacheShared("events", 600), getEvents);
router.post("/seed", authMiddleware, adminOrHr, seedHolidays);
router.post("/add", authMiddleware, adminOrHr, addEvent);
router.put("/:id", authMiddleware, adminOrHr, updateEvent);
router.delete("/:id", authMiddleware, adminOrHr, deleteEvent);

export default router;
