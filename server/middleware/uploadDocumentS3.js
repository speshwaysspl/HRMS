// backend/middleware/uploadDocumentS3.js
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Function to get S3 client (lazy initialization)
const getS3Client = () => {
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
    // Allow images, pdfs, docs
    const allowedTypes = [
        "image/jpeg", 
        "image/png", 
        "image/jpg", 
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, PDFs, and Word documents are allowed"));
  }
};

// Multer configuration
export const uploadDocumentS3 = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

// Function to upload file to S3
export const uploadDocToS3 = async (file, folder = "documents") => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `${folder}/${uuidv4()}${fileExtension}`;
  
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const s3Client = getS3Client();
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    // Return the S3 URL
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    return { success: true, url: s3Url, key: fileName };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(`Failed to upload document to S3: ${error.message}`);
  }
};


// Function to delete file from S3
export const deleteDocFromS3 = async (fileKey) => {
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
    throw new Error("Failed to delete document from S3");
  }
};

/**
 * Stream an object from our bucket, given its public URL. Returns null when the URL
 * isn't in our bucket (so callers can't be used to fetch arbitrary hosts).
 */
export const getDocStreamFromS3 = async (url) => {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" || parsed.hostname !== `${bucket}.s3.${region}.amazonaws.com`) return null;
  const key = decodeURIComponent(parsed.pathname.slice(1));
  if (!key) return null;
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const out = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return { body: out.Body, contentType: out.ContentType, contentLength: out.ContentLength };
};
