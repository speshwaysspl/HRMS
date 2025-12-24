import cron from "node-cron";
import Task from "../models/Task.js";

export const initializeTaskScheduler = () => {
  // Schedule task to run every Monday at 00:00
  cron.schedule("0 0 * * 1", async () => {
    console.log("Running Monday Task Reset Job...");
    try {
      // Soft delete all active tasks
      const result = await Task.updateMany(
        { isDeleted: { $ne: true } }, 
        { isDeleted: true }
      );
      console.log(`Monday Task Reset: Soft deleted ${result.modifiedCount} tasks.`);
    } catch (error) {
      console.error("Error running Monday Task Reset Job:", error);
    }
  });
  
  console.log("Task Scheduler initialized: Tasks will be reset every Monday at 00:00.");
};
