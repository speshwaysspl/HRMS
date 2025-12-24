import Event from "../models/Event.js";
import { createHolidayNotification, createEventNotification } from "./notificationController.js";
import { holidays } from "../utils/holidays.js";

const seedHolidaysInternal = async () => {
  try {
    let count = 0;
    for (const holiday of holidays) {
      const existing = await Event.findOne({
        date: new Date(holiday.date),
        title: holiday.title
      });
      
      if (!existing) {
        await new Event({
          ...holiday,
          date: new Date(holiday.date)
        }).save();
        count++;
      }
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
    const events = await Event.find();
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
    return res.status(200).json({ success: true, event: deleteEvent });
  } catch (error) {
    return res.status(500).json({ success: false, error: "delete event server error" });
  }
};

export { getEvents, addEvent, updateEvent, deleteEvent, seedHolidays, seedHolidaysInternal };
