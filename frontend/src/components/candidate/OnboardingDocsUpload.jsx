import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { uploadOnboardingDocument } from "../../redux/slices/onboardingSlice";
import { toast } from "react-toastify";
import { FaCloudUploadAlt, FaCheckCircle, FaTimesCircle, FaClock, FaEye, FaTrash } from "react-icons/fa";

const OnboardingDocsUpload = ({ documents = [], candidate }) => {
  const dispatch = useDispatch();
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const isFresher = candidate?.professionalDetails?.experience?.toLowerCase() === "fresher";

  const allDocumentTypes = [
    { key: "Aadhaar", label: "Aadhaar Card", category: "Identity" },
    { key: "PAN", label: "PAN Card", category: "Identity" },
    { key: "SSC Certificate", label: "SSC (10th) Certificate", category: "Education" },
    { key: "Intermediate Certificate", label: "Intermediate (12th) Certificate", category: "Education" },
    { key: "Degree Certificate", label: "Degree Certificate", category: "Education" },
    { key: "Resume", label: "Updated Resume", category: "Employment" },
    { key: "Experience Letters", label: "Previous Experience Letters", category: "Employment", hideForFresher: true },
    { key: "Relieving Letter", label: "Relieving Letter", category: "Employment", hideForFresher: true },
    { key: "Passbook", label: "Bank Passbook / First Page", category: "Banking" },
    { key: "Passport Photo", label: "Passport Size Photograph", category: "Other" },
    { key: "Signature", label: "Digital Signature Specimen", category: "Other" }
  ];

  const documentTypes = allDocumentTypes.filter(d => !(isFresher && d.hideForFresher));

  // Client-side image compression using HTML5 Canvas
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.75 // 75% quality compression
          );
        };
      };
    });
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB!");
      return;
    }

    // Validate type
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file format. Please upload PDF, Word Doc, or JPEG/PNG image.");
      return;
    }

    setUploadingDoc(docType);
    let fileToUpload = file;

    // Compress if image
    if (file.type.startsWith("image/")) {
      toast.info("Compressing image before upload...");
      fileToUpload = await compressImage(file);
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("docType", docType);

    try {
      const resultAction = await dispatch(uploadOnboardingDocument(formData));
      if (uploadOnboardingDocument.fulfilled.match(resultAction)) {
        toast.success(`${docType} uploaded successfully!`);
      } else {
        toast.error(resultAction.payload || "Failed to upload document.");
      }
    } catch (err) {
      toast.error("Upload error. Please try again.");
    } finally {
      setUploadingDoc(null);
    }
  };

  // Group documents by category
  const categories = ["Identity", "Education", "Employment", "Banking", "Other"];

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl max-w-4xl mx-auto shadow-2xl">
      <div className="mb-8">
        <h3 className="text-xl font-bold">Upload Required Documents</h3>
        <p className="text-sm text-slate-400 mt-1">Please provide clean scans or PDFs. Maximum file size: 10MB per document.</p>
      </div>

      <div className="space-y-8">
        {categories.map((category) => {
          const categoryDocs = documentTypes.filter((d) => d.category === category);
          return (
            <div key={category} className="space-y-4">
              <h4 className="text-sm font-extrabold text-blue-400 uppercase tracking-widest border-b border-white/5 pb-2">
                {category} Documents
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryDocs.map((docType) => {
                  // Find if document already exists
                  const uploaded = documents?.find((d) => d.fileType === docType.key);
                  const isUploading = uploadingDoc === docType.key;

                  return (
                    <div
                      key={docType.key}
                      className="flex flex-col justify-between p-5 rounded-2xl border border-white/5 bg-slate-950/20 hover:border-white/10 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-slate-200">{docType.label}</div>
                          {uploaded && (
                            <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
                              {uploaded.originalName}
                            </div>
                          )}
                        </div>

                        {/* Status Badges */}
                        {uploaded ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {uploaded.status === "Approved" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400 border border-green-500/20">
                                <FaCheckCircle /> Approved
                              </span>
                            )}
                            {uploaded.status === "Rejected" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
                                <FaTimesCircle /> Rejected
                              </span>
                            )}
                            {uploaded.status === "Pending" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-400 border border-yellow-500/20">
                                <FaClock /> Pending HR Review
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 shrink-0">Not Uploaded</span>
                        )}
                      </div>

                      {/* Comment section for rejections */}
                      {uploaded && uploaded.comments && (
                        <div className="mt-3 rounded-lg bg-red-950/20 border border-red-500/10 p-3 text-xs text-red-300">
                          <b>HR Rejection Comment:</b> {uploaded.comments}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-4 mt-5 pt-4 border-t border-white/5">
                        {uploaded && (
                          <a
                            href={uploaded.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
                          >
                            <FaEye /> View Document
                          </a>
                        )}

                        <div className="relative overflow-hidden ml-auto">
                          <input
                            type="file"
                            id={`file-input-${docType.key}`}
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => handleFileUpload(e, docType.key)}
                          />
                          <label
                            htmlFor={`file-input-${docType.key}`}
                            className={`flex items-center gap-1.5 rounded-xl border border-white/10 hover:bg-white/5 px-4 py-2 text-xs font-semibold cursor-pointer transition ${
                              isUploading ? "opacity-50 pointer-events-none" : ""
                            }`}
                          >
                            <FaCloudUploadAlt /> {isUploading ? "Uploading..." : uploaded ? "Re-upload File" : "Upload File"}
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingDocsUpload;
