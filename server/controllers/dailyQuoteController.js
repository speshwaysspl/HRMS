import DailyQuote from "../models/DailyQuote.js";
import fs from "fs";
import path from "path";
import { saveFile, deleteFile, getFileKeyFromUrl } from "../utils/fileSaver.js";

// Helper function to emit socket updates in real-time
const broadcastQuoteUpdate = (req) => {
  if (req.io) {
    console.log("📣 Broadcasting daily-quote-updated event via socket");
    req.io.emit("daily-quote-updated");
  }
};

export const getDailyQuote = async (req, res) => {
  try {
    // Get the latest quote that is scheduled for now or in the past
    const quote = await DailyQuote.findOne({ createdAt: { $lte: new Date() } }).sort({ createdAt: -1 });
    if (!quote) {
      // Return a default or null if no quote exists
      return res.status(200).json({ success: true, quote: null });
    }
    return res.status(200).json({ success: true, quote });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error fetching daily quote" });
  }
};

export const addDailyQuote = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided" });
    }

    const uploadResult = await saveFile(req.file, "daily-quotes");
    const imageUrl = uploadResult.url;
    const { scheduledDate } = req.body;

    const newQuote = new DailyQuote({
      imageUrl,
      createdAt: scheduledDate ? new Date(scheduledDate) : new Date(),
    });

    await newQuote.save();
    broadcastQuoteUpdate(req);

    return res.status(201).json({ success: true, quote: newQuote });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error adding daily quote" });
  }
};

export const getDailyQuotesHistory = async (req, res) => {
  try {
    const quotes = await DailyQuote.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, quotes });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error fetching quote history" });
  }
};

export const deleteDailyQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const quote = await DailyQuote.findById(id);
    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    const fileKey = getFileKeyFromUrl(quote.imageUrl);
    if (fileKey) {
      await deleteFile(fileKey);
    }

    await DailyQuote.findByIdAndDelete(id);
    broadcastQuoteUpdate(req);

    return res.status(200).json({ success: true, message: "Quote deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error deleting quote" });
  }
};

export const activateDailyQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const quote = await DailyQuote.findById(id);
    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    quote.createdAt = new Date();
    await quote.save();
    broadcastQuoteUpdate(req);

    return res.status(200).json({ success: true, quote });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error activating quote" });
  }
};

export const deleteAllDailyQuotes = async (req, res) => {
  try {
    const quotes = await DailyQuote.find();
    
    for (const quote of quotes) {
      const fileKey = getFileKeyFromUrl(quote.imageUrl);
      if (fileKey) {
        await deleteFile(fileKey);
      }
    }

    // Delete all records in database
    await DailyQuote.deleteMany({});
    broadcastQuoteUpdate(req);

    return res.status(200).json({ success: true, message: "All daily quotes deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error deleting all quotes" });
  }
};

export const updateDailyQuoteDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, error: "Date is required" });
    }

    const quote = await DailyQuote.findById(id);
    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    quote.createdAt = new Date(date);
    await quote.save();
    broadcastQuoteUpdate(req);

    return res.status(200).json({ success: true, quote });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error updating quote date" });
  }
};

export const updateDailyQuoteImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided" });
    }

    const quote = await DailyQuote.findById(id);
    if (!quote) {
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    const uploadResult = await saveFile(req.file, "daily-quotes");

    // Delete the old file
    const oldFileKey = getFileKeyFromUrl(quote.imageUrl);
    if (oldFileKey) {
      await deleteFile(oldFileKey);
    }

    // Update with new image url
    quote.imageUrl = uploadResult.url;
    quote.updatedAt = new Date();
    await quote.save();
    broadcastQuoteUpdate(req);

    return res.status(200).json({ success: true, quote });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error replacing quote image" });
  }
};
