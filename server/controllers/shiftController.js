import Shift from "../models/Shift.js";

const getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find().sort({ startTime: 1 });
    return res.status(200).json({ success: true, shifts });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch shifts" });
  }
};

const addShift = async (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: "name, startTime and endTime are required" });
    }
    const shift = new Shift({ name, startTime, endTime });
    await shift.save();
    return res.status(200).json({ success: true, shift });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to add shift" });
  }
};

const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime } = req.body;
    const shift = await Shift.findByIdAndUpdate(id, { name, startTime, endTime }, { new: true });
    if (!shift) {
      return res.status(404).json({ success: false, error: "Shift not found" });
    }
    return res.status(200).json({ success: true, shift });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to update shift" });
  }
};

const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Shift.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Shift not found" });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to delete shift" });
  }
};

export { getShifts, addShift, updateShift, deleteShift };
