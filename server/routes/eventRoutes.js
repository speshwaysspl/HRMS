import express from "express";
import authMiddleware from "../middleware/authMiddlware.js";
import {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  seedHolidays,
} from "../controllers/eventController.js";

const router = express.Router();

router.get("/", authMiddleware, getEvents);
router.post("/seed", authMiddleware, seedHolidays);
router.post("/add", authMiddleware, addEvent);
router.put("/:id", authMiddleware, updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);

export default router;
