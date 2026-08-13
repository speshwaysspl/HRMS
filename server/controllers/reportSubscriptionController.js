import ReportSubscription from "../models/ReportSubscription.js";

const getMySubscription = async (req, res) => {
  try {
    let subscription = await ReportSubscription.findOne({ userId: req.user._id });
    if (!subscription) {
      subscription = { userId: req.user._id, weeklySummaryEnabled: true };
    }
    return res.status(200).json({ success: true, subscription });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch report subscription" });
  }
};

const updateMySubscription = async (req, res) => {
  try {
    const { weeklySummaryEnabled } = req.body;
    const subscription = await ReportSubscription.findOneAndUpdate(
      { userId: req.user._id },
      { weeklySummaryEnabled },
      { new: true, upsert: true }
    );
    return res.status(200).json({ success: true, subscription });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to update report subscription" });
  }
};

export { getMySubscription, updateMySubscription };
