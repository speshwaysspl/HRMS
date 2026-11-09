import mongoose from "mongoose";

const shortLinkSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    targetUrl: { type: String, required: true },
    title: { type: String, default: "", maxlength: 120 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    clicks: { type: Number, default: 0 },
    lastClickedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const ShortLink = mongoose.model("ShortLink", shortLinkSchema);
export default ShortLink;
