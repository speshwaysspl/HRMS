import Event from "../models/Event.js";
import { createHolidayNotification, createEventNotification } from "./notificationController.js";
import { holidays } from "../utils/holidays.js";

const seedHolidaysInternal = async () => {
  try {
    let count = 0;
    for (const holiday of holidays) {
      if (!holiday.date) continue;
      // Upsert so two server processes seeding at once can't create duplicates.
      const r = await Event.updateOne(
        { date: new Date(holiday.date), title: holiday.title },
        { $setOnInsert: { ...holiday, date: new Date(holiday.date) } },
        { upsert: true }
      );
      if (r.upsertedCount) count++;
    }
    if (count > 0) {
      console.log(`Auto-seeded ${count} new holidays`);
    }
    return count;
  } catch (error) {
    console.error("Auto-seed error:", error);
    return 0;
  }
};

const seedHolidays = async (req, res) => {
  try {
    const count = await seedHolidaysInternal();
    return res.status(200).json({ success: true, message: `Added ${count} new holidays` });
  } catch (error) {
    console.error("Seed error:", error);
    return res.status(500).json({ success: false, error: "seed holidays server error" });
  }
};

const getEvents = async (req, res) => {
  try {
    const all = await Event.find().sort({ date: 1, createdAt: 1 }).lean();
    // Same title on the same day is one event (older seeding created copies).
    const seen = new Set();
    const events = all.filter((e) => {
      const k = `${e.title.trim().toLowerCase()}|${new Date(e.date).toISOString().slice(0, 10)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return res.status(200).json({ success: true, events });
  } catch (error) {
    return res.status(500).json({ success: false, error: "get events server error" });
  }
};

const addEvent = async (req, res) => {
  try {
    const { title, date, description, type } = req.body;
    const newEvent = new Event({
      title,
      date,
      description,
      type,
    });
    await newEvent.save();
    try {
      const io = req.app.get("io");
      // Send notifications to all active employees for any event type
      await createEventNotification(newEvent, req.user._id, io);
    } catch (err) {
    }
    return res.status(200).json({ success: true, event: newEvent });
  } catch (error) {
    return res.status(500).json({ success: false, error: "add event server error" });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, description, type } = req.body;
    const updateEvent = await Event.findByIdAndUpdate(
      id,
      { title, date, description, type },
      { new: true }
    );
    if (!updateEvent) {
      return res.status(404).json({ success: false, error: "event not found" });
    }
    return res.status(200).json({ success: true, event: updateEvent });
  } catch (error) {
    return res.status(500).json({ success: false, error: "update event server error" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteEvent = await Event.findByIdAndDelete(id);
    if (!deleteEvent) {
      return res.status(404).json({ success: false, error: "event not found" });
    }
    // Also drop hidden duplicates of the same event.
    await Event.deleteMany({ title: deleteEvent.title, date: deleteEvent.date });
    return res.status(200).json({ success: true, event: deleteEvent });
  } catch (error) {
    return res.status(500).json({ success: false, error: "delete event server error" });
  }
};

export { getEvents, addEvent, updateEvent, deleteEvent, seedHolidays, seedHolidaysInternal };
