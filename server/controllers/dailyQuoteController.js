import DailyQuote from "../models/DailyQuote.js";
import fs from "fs";
import path from "path";

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

    const imageUrl = `/uploads/daily-quotes/${req.file.filename}`;
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

    // Resolve file path to delete the physical image
    // imageUrl starts with "/uploads/daily-quotes/..."
    const relativePath = quote.imageUrl.substring(1); // removes leading slash
    const filepath = path.resolve("public", relativePath);

    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath);
      } catch (err) {
        console.error("Failed to delete physical file:", err);
      }
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
    
    // Unlink all physical image files
    for (const quote of quotes) {
      const relativePath = quote.imageUrl.substring(1);
      const filepath = path.resolve("public", relativePath);
      if (fs.existsSync(filepath)) {
        try {
          fs.unlinkSync(filepath);
        } catch (err) {
          console.error("Failed to delete physical file:", err);
        }
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
      // Clean up newly uploaded file if document is not found
      const newPath = path.resolve("public", "uploads", "daily-quotes", req.file.filename);
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      return res.status(404).json({ success: false, error: "Quote not found" });
    }

    // Delete the old file from disk
    const oldRelativePath = quote.imageUrl.substring(1);
    const oldFilepath = path.resolve("public", oldRelativePath);
    if (fs.existsSync(oldFilepath)) {
      try {
        fs.unlinkSync(oldFilepath);
      } catch (err) {
        console.error("Failed to delete old physical file:", err);
      }
    }

    // Update with new image url
    quote.imageUrl = `/uploads/daily-quotes/${req.file.filename}`;
    quote.updatedAt = new Date();
    await quote.save();
    broadcastQuoteUpdate(req);

    return res.status(200).json({ success: true, quote });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error replacing quote image" });
  }
};
