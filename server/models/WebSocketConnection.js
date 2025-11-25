import mongoose from "mongoose";

const schema = new mongoose.Schema({
  connectionId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("WebSocketConnection", schema);