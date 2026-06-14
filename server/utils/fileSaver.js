import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadDocToS3 } from "../middleware/uploadDocumentS3.js";

/**
 * Saves a file to AWS S3 (if configured) or falls back to local disk storage.
 * @param {Object} file Multer file object
 * @param {string} folder Subfolder name
 * @returns {Promise<Object>} { url, key }
 */
export const saveFile = async (file, folder = "documents") => {
  // If we have S3 configured, try to upload there
  if (process.env.AWS_REGION && process.env.AWS_S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
    try {
      const s3Result = await uploadDocToS3(file, folder);
      if (s3Result && s3Result.url) {
        return {
          url: s3Result.url,
          key: s3Result.key
        };
      }
    } catch (err) {
      console.warn("AWS S3 Upload failed, falling back to local storage:", err.message);
    }
  }

  // Local storage fallback
  const ext = path.extname(file.originalname);
  const fileName = `${uuidv4()}${ext}`;
  const uploadDir = path.resolve("public", "uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, file.buffer);

  // Use relative web URL path
  const localUrl = `/uploads/${folder}/${fileName}`;
  return {
    url: localUrl,
    key: `local/${folder}/${fileName}`
  };
};

/**
 * Deletes a file from either local disk or S3 depending on the key format.
 * @param {string} fileKey File identifier
 */
export const deleteFile = async (fileKey) => {
  if (!fileKey) return;
  
  if (fileKey.startsWith("local/")) {
    try {
      const relativePath = fileKey.replace("local/", "");
      const filePath = path.resolve("public", "uploads", relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Local file delete error:", err);
    }
  } else {
    try {
      const { deleteDocFromS3 } = await import("../middleware/uploadDocumentS3.js");
      await deleteDocFromS3(fileKey);
    } catch (err) {
      console.error("S3 file delete error:", err);
    }
  }
};

/**
 * Helper to extract the fileKey (local/ or S3 path) from a stored URL.
 * @param {string} url Stored file URL
 * @returns {string|null} fileKey
 */
export const getFileKeyFromUrl = (url) => {
  if (!url) return null;
  if (url.includes("amazonaws.com")) {
    try {
      const parsed = new URL(url);
      return decodeURIComponent(parsed.pathname.substring(1));
    } catch (e) {
      const parts = url.split("amazonaws.com/");
      if (parts.length > 1) {
        return decodeURIComponent(parts[1]);
      }
    }
  }
  if (url.startsWith("/uploads/")) {
    return `local/${url.replace("/uploads/", "")}`;
  }
  return null;
};

