import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { FaFileUpload, FaTrash, FaFilePdf, FaFileImage, FaFileWord, FaDownload, FaEye, FaFolderOpen } from "react-icons/fa";
import { SkeletonRow } from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const DOCUMENT_TYPES = ["ID Proof", "Educational Certificate", "Offer Letter", "Contract", "Other"];

const DocumentUpload = () => {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("Other");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/document`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        setDocuments(response.data.documents);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    if (expiryDate) formData.append("expiryDate", expiryDate);

    setUploading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/document/upload`, formData, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.success) {
        setDocuments([response.data.document, ...documents]);
        setFile(null);
        setExpiryDate("");
        // Reset file input
        document.getElementById("fileInput").value = "";
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert(error.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const response = await axios.delete(`${API_BASE}/api/document/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) {
        setDocuments(documents.filter((doc) => doc._id !== id));
      }
    } catch (error) {
        alert(error.response?.data?.error || "Delete failed");
    }
  };

  const getFileIcon = (type) => {
      if (type && type.includes("pdf")) return <FaFilePdf className="text-red-500 text-2xl" />;
      if (type && type.includes("image")) return <FaFileImage className="text-blue-500 text-2xl" />;
      if (type && type.includes("word")) return <FaFileWord className="text-blue-700 text-2xl" />;
      return <FaFileUpload className="text-gray-500 text-2xl" />;
  };

  const getExpiryBadge = (expiryDate) => {
      if (!expiryDate) return <span className="text-ink-faint text-sm">—</span>;
      const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      const label = new Date(expiryDate).toLocaleDateString();
      if (daysLeft < 0) return <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Expired {label}</span>;
      if (daysLeft <= 30) return <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Expires {label}</span>;
      return <span className="text-ink-muted text-sm">{label}</span>;
  };

  const getStatusBadge = (status) => {
      switch(status) {
          case 'Approved': return <span className="bg-accent-100 text-accent-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Approved</span>;
          case 'Rejected': return <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Rejected</span>;
          default: return <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Pending</span>;
      }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-card border border-surface-subtle">
      <h2 className="text-2xl font-semibold mb-6 text-ink">My Documents</h2>

      {/* Upload Section */}
      <div className="mb-8 p-6 border-2 border-dashed border-surface-subtle rounded-xl bg-surface-muted text-center">
        <form onSubmit={handleUpload} className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="flex-1 p-2 border border-surface-subtle rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="Expiry date (optional)"
                className="flex-1 p-2 border border-surface-subtle rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <input
                type="file"
                id="fileInput"
                onChange={handleFileChange}
                className="block w-full text-sm text-ink-muted
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-accent-50 file:text-accent-700
                hover:file:bg-accent-100"
            />
            <button
                type="submit"
                disabled={uploading || !file}
                className={`px-6 py-2 rounded-lg text-white font-medium transition-colors
                    ${uploading || !file ? 'bg-ink-faint cursor-not-allowed' : 'bg-accent-600 hover:bg-accent-700'}
                `}
            >
                {uploading ? "Uploading..." : "Upload Document"}
            </button>
        </form>
      </div>

      {/* Documents List */}
      <div className="overflow-x-auto rounded-lg border border-surface-subtle">
          <table className="min-w-full divide-y divide-surface-subtle">
              <thead className="bg-surface-muted">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">File</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Expiry</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Comments</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">Actions</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-surface-subtle">
                  {loading ? (
                      <>
                        <SkeletonRow columns={8} />
                        <SkeletonRow columns={8} />
                        <SkeletonRow columns={8} />
                      </>
                  ) : documents.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <EmptyState icon={FaFolderOpen} title="No documents uploaded" message="Upload a document above to see it listed here." />
                        </td>
                      </tr>
                  ) : (
                      documents.map((doc) => (
                          <tr key={doc._id} className="hover:bg-surface-muted">
                              <td className="px-6 py-4 whitespace-nowrap">{getFileIcon(doc.fileType)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                                {doc.originalName}
                                {doc.version > 1 && (
                                  <span className="ml-1.5 text-xs text-ink-faint">v{doc.version}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">{doc.documentType || "Other"}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{getExpiryBadge(doc.expiryDate)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">{new Date(doc.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">{doc.comments || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <a href={`${API_BASE}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 mr-4">
                                      <FaEye className="inline" />
                                  </a>
                                  {doc.status === 'Pending' && (
                                      <button onClick={() => handleDelete(doc._id)} className="text-red-600 hover:text-red-700">
                                          <FaTrash className="inline" />
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default DocumentUpload;
