import DailyQuote from "../models/DailyQuote.js";

export const getDailyQuote = async (req, res) => {
  try {
    // Get the latest quote
    const quote = await DailyQuote.findOne().sort({ createdAt: -1 });
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

    const newQuote = new DailyQuote({
      imageUrl,
    });

    await newQuote.save();

    return res.status(201).json({ success: true, quote: newQuote });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error adding daily quote" });
  }
};
