import dotenv from "dotenv";
import connectToDatabase from "./db/db.js";
import { processBirthdayWishes } from "./services/birthdayService.js";

dotenv.config({ quiet: true });

export const handler = async () => {
  await connectToDatabase();
  const result = await processBirthdayWishes();
  return { statusCode: 200, body: JSON.stringify(result) };
};