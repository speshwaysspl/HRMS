import mongoose from "mongoose";

// Built-in holidays an admin deleted, so the startup seeder doesn't re-add them.
const deletedHolidaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
});
deletedHolidaySchema.index({ title: 1, date: 1 }, { unique: true });

export default mongoose.model("DeletedHoliday", deletedHolidaySchema);
