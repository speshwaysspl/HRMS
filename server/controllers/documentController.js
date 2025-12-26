import Document from "../models/Document.js";
import Employee from "../models/Employee.js";
import Team from "../models/Team.js";
import { uploadToS3 } from "../middleware/uploadDocument.js";

// Upload Document
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee record not found" });
    }

    let fileUrl;
    try {
        const uploadResult = await uploadToS3(req.file, 'documents');
        fileUrl = uploadResult.url;
    } catch (error) {
        console.error("Document upload error:", error);
        return res.status(500).json({ success: false, error: "Failed to upload document" });
    }

    const newDocument = new Document({
      employeeId: employee._id,
      uploadedBy: req.user._id,
      fileUrl: fileUrl,
      fileType: req.file.mimetype,
      originalName: req.file.originalname,
    });

    await newDocument.save();

    return res.status(200).json({ success: true, document: newDocument });
  } catch (error) {
    console.error("Upload document error:", error);
    return res.status(500).json({ success: false, error: "Server error uploading document" });
  }
};

// Get Documents
export const getDocuments = async (req, res) => {
  try {
    const { role, _id } = req.user;
    let query = {};

    if (role === "admin") {
      // Admin can see all, or filter by employeeId if provided in query
      if (req.query.employeeId) {
        query.employeeId = req.query.employeeId;
      }
    } else if (role === "team_lead") {
        // Team Lead can see documents of their team members
        // First find teams led by this user
        const teams = await Team.find({ leadId: _id });
        const memberEmployeeIds = teams.flatMap(team => team.members.map(m => m.employeeId));
        
        if (req.query.employeeId) {
             // Check if the requested employee is in their team
             if (memberEmployeeIds.some(id => id.toString() === req.query.employeeId)) {
                 query.employeeId = req.query.employeeId;
             } else {
                 // Or maybe they are viewing their own documents?
                 // For now, if they request an employee not in their team, return empty or forbidden.
                 // Let's assume they want to see documents for a specific employee in their team.
                 return res.status(403).json({ success: false, error: "Access denied to this employee's documents" });
             }
        } else {
            // If no specific employee requested, return documents for all team members
             query.employeeId = { $in: memberEmployeeIds };
        }

    } else {
      // Employee can only see their own
      const employee = await Employee.findOne({ userId: _id });
      if (!employee) {
          return res.status(404).json({ success: false, error: "Employee record not found" });
      }
      query.employeeId = employee._id;
    }

    const documents = await Document.find(query)
      .populate({
          path: "employeeId",
          select: "employeeId userId",
          populate: { path: "userId", select: "name" }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error("Get documents error:", error);
    return res.status(500).json({ success: false, error: "Server error fetching documents" });
  }
};

// Update Document Status (Team Lead/Admin)
export const updateDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    
    // Check permissions - Admin and Team Lead can update
    if (req.user.role !== "admin" && req.user.role !== "team_lead") {
        return res.status(403).json({ success: false, error: "Access denied" });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    // Additional check for Team Lead: ensure document belongs to a team member
    if (req.user.role === "team_lead") {
         const teams = await Team.find({ leadId: req.user._id });
         const memberEmployeeIds = teams.flatMap(team => team.members.map(m => m.employeeId.toString()));
         
         if (!memberEmployeeIds.includes(document.employeeId.toString())) {
             return res.status(403).json({ success: false, error: "You can only update status for your team members" });
         }
    }

    if (status) document.status = status;
    if (comments) document.comments = comments;
    document.updatedAt = Date.now();

    await document.save();

    return res.status(200).json({ success: true, document });
  } catch (error) {
    console.error("Update document status error:", error);
    return res.status(500).json({ success: false, error: "Server error updating document" });
  }
};

// Delete Document (Employee only if pending, or Admin)
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await Document.findById(id);
        
        if (!document) {
            return res.status(404).json({ success: false, error: "Document not found" });
        }

        if (req.user.role === "admin") {
            // Admin can delete any
        } else {
             // Employee can delete only if status is Pending and it's their document
             if (document.uploadedBy.toString() !== req.user._id.toString()) {
                 return res.status(403).json({ success: false, error: "Access denied" });
             }
             if (document.status !== "Pending") {
                 return res.status(400).json({ success: false, error: "Cannot delete processed document" });
             }
        }

        await Document.findByIdAndDelete(id);
        
        // Delete file from S3 if key exists
        if (document.fileKey) {
            try {
                await deleteFromS3(document.fileKey);
            } catch (err) {
                console.error("Failed to delete file from S3:", err);
                // Continue even if S3 delete fails
            }
        }
        
        return res.status(200).json({ success: true, message: "Document deleted" });

    } catch (error) {
        console.error("Delete document error:", error);
        return res.status(500).json({ success: false, error: "Server error deleting document" });
    }
}
