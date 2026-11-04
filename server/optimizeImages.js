import dotenv from "dotenv";
import mongoose from "mongoose";
import sharp from "sharp";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import connectToDatabase from "./db/db.js";
import Employee from "./models/Employee.js";
import Announcement from "./models/Announcement.js";

dotenv.config({ quiet: true });

/**
 * One-off: convert images saved before WebP optimisation.
 *  • Employee ID-card photos (data URLs in Mongo) → 400px WebP
 *  • Announcement images on S3 → ≤1280px WebP, new key with a 1-year cache header;
 *    the old S3 object is deleted after the announcement points at the new one.
 *
 *   node optimizeImages.js          # dry run — reports what would change
 *   node optimizeImages.js --apply  # actually converts
 *
 * Safe to re-run: already-WebP items are skipped.
 */
const APPLY = process.argv.includes("--apply");
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});
const BUCKET = process.env.AWS_S3_BUCKET_NAME;

const photos = async () => {
  const emps = await Employee.find({ profileImage: { $regex: /^data:image\/(jpeg|png);base64,/ } }).select("_id employeeId profileImage");
  let before = 0, after = 0;
  for (const e of emps) {
    const input = Buffer.from(e.profileImage.slice(e.profileImage.indexOf(",") + 1), "base64");
    const out = await sharp(input).resize({ width: 400, height: 400, fit: "cover" }).webp({ quality: 80 }).toBuffer();
    before += input.length;
    after += out.length;
    console.log(`photo ${e.employeeId}: ${kb(input.length)} → ${kb(out.length)}`);
    if (APPLY) await Employee.updateOne({ _id: e._id }, { profileImage: `data:image/webp;base64,${out.toString("base64")}` });
  }
  console.log(`ID-card photos: ${emps.length} · ${kb(before)} → ${kb(after)}`);
};

const announcementImages = async () => {
  const list = await Announcement.find({ imageKey: { $ne: null, $not: /\.webp$/i } }).select("_id title image imageKey");
  let before = 0, after = 0, done = 0;
  for (const a of list) {
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: a.imageKey }));
      const input = Buffer.from(await obj.Body.transformToByteArray());
      if (/gif/i.test(obj.ContentType || "")) continue; // keep animations
      const out = await sharp(input)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      before += input.length;
      after += out.length;
      console.log(`announcement "${a.title}": ${kb(input.length)} → ${kb(out.length)}`);
      if (!APPLY) continue;
      const key = `announcements/${uuidv4()}.webp`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: out,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }));
      const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      await Announcement.updateOne({ _id: a._id }, { image: url, imageKey: key });
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: a.imageKey })).catch(() => {});
      done++;
    } catch (err) {
      console.warn(`skip "${a.title}": ${err.message}`);
    }
  }
  console.log(`Announcement images: ${list.length} found${APPLY ? `, ${done} converted` : ""} · ${kb(before)} → ${kb(after)}`);
};

(async () => {
  await connectToDatabase();
  console.log(APPLY ? "Converting…" : "Dry run (add --apply to convert)");
  await photos();
  await announcementImages();
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
