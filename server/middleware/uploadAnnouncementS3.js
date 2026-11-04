// backend/middleware/uploadAnnouncementS3.js
import multer from "multer";
import sharp from "sharp";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Function to get S3 client (lazy initialization)
const getS3Client = () => {
  console.log("S3 Configuration:", {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
  });

  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Multer configuration
export const uploadAnnouncementS3 = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

// Function to upload file to S3
// Announcement images are shown at most ~1280px wide, so store a resized
// WebP (typically 5–20× smaller than the phone photo / PNG that was uploaded).
// GIFs and anything sharp can't read are stored as-is.
const optimizeImage = async (file) => {
  if (!/^image\/(jpe?g|png|webp|heic|heif|avif|tiff)$/i.test(file.mimetype)) {
    return { buffer: file.buffer, ext: path.extname(file.originalname), type: file.mimetype };
  }
  try {
    const buffer = await sharp(file.buffer)
      .rotate() // respect EXIF orientation from phone cameras
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { buffer, ext: ".webp", type: "image/webp" };
  } catch (err) {
    console.warn("Image optimize failed, storing original:", err.message);
    return { buffer: file.buffer, ext: path.extname(file.originalname), type: file.mimetype };
  }
};

export const uploadToS3 = async (file) => {
  const optimized = await optimizeImage(file);
  const fileName = `announcements/${uuidv4()}${optimized.ext}`;
  
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    Body: optimized.buffer,
    ContentType: optimized.type,
    // Keys are unique (uuid), so the file never changes: let browsers and the
    // app cache it for a year.
    CacheControl: "public, max-age=31536000, immutable",
    // Removed ACL as it might be disabled on the bucket
  };

  try {
    console.log("Uploading to S3 with params:", {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType
    });
    
    const s3Client = getS3Client();
    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);
    
    console.log("S3 upload successful:", result);
    
    // Return the S3 URL
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    return { success: true, url: s3Url, key: fileName };
  } catch (error) {
    console.error("S3 upload error details:", {
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    throw new Error(`Failed to upload image to S3: ${error.message}`);
  }
};

// Function to delete file from S3
export const deleteFromS3 = async (fileKey) => {
  const deleteParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
  };

  try {
    const s3Client = getS3Client();
    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error("S3 delete error:", error);
    throw new Error("Failed to delete image from S3");
  }
};

export default uploadAnnouncementS3;