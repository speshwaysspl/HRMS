import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Function to get S3 client
const getS3Client = () => {
  const config = {
    region: process.env.AWS_S3_REGION || process.env.AWS_REGION,
  };

  // Only add credentials if they are explicitly provided (for local dev)
  // Otherwise, let the SDK use the default provider chain (IAM roles for Lambda)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  return new S3Client(config);
};

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

export const uploadDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

export const uploadToS3 = async (file, folder = 'documents') => {
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
    
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    return { success: true, url: s3Url, key: fileName };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(`Failed to upload document to S3: ${error.message}`);
  }
};

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
    throw new Error("Failed to delete document from S3");
  }
};

export default uploadDocument;
