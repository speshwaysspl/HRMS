import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
// ... import other routers
import connectToDatabase from "./db/db.js";

dotenv.config();
connectToDatabase();

const app = express();

app.use(cors({ 
  origin: process.env.CLIENT_URL || "http://localhost:5173", 
  credentials: true 
}));
app.use(express.json());
app.use("/uploads", express.static(path.resolve("public", "uploads")));
app.use("/assets", express.static(path.resolve("assets")));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Mount routes
app.use("/api/auth", authRouter);
// ... mount other routers

export default app;

