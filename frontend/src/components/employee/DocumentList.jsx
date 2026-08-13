import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { FaFilePdf, FaFileImage, FaFileWord, FaEye, FaUpload, FaTrash, FaFolderOpen, FaEdit } from "react-icons/fa";
import { SkeletonRow } from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const DOCUMENT_TYPES = ["ID Proof", "Educational Certificate", "Offer Letter", "Contract", "Other"];

const DocumentList = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null); // For status modal
  const [statusComment, setStatusComment] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState(""); // For search

  // Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState("Other");
  const [uploadExpiryDate, setUploadExpiryDate] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

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
    setUploadFile(e.target.files[0]);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
        alert("Please select a file");
        return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("documentType", uploadDocType);
    if (uploadExpiryDate) formData.append("expiryDate", uploadExpiryDate);

    setUploadLoading(true);
    try {
        const response = await axios.post(`${API_BASE}/api/document/upload`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
        });

        if (response.data.success) {
            setDocuments([response.data.document, ...documents]);
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadDocType("Other");
            setUploadExpiryDate("");
            // Re-fetch to get populated fields if needed, or just append
            fetchDocuments();
        }
    } catch (error) {
        alert(error.response?.data?.error || "Upload failed");
    } finally {
        setUploadLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
      if (!filterEmployeeId) return true;
      const empName = doc.employeeId?.userId?.name?.toLowerCase() || "";
      const empId = doc.employeeId?.employeeId?.toLowerCase() || "";
      const search = filterEmployeeId.toLowerCase();
      return empName.includes(search) || empId.includes(search);
  });

  const handleUpdateStatus = async (id, status) => {
      try {
          const response = await axios.put(`${API_BASE}/api/document/${id}/status`, 
            { status, comments: statusComment },
            { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
          );
          if (response.data.success) {
              setDocuments(documents.map(doc => doc._id === id ? response.data.document : doc));
              setSelectedDoc(null);
              setStatusComment("");
          }
      } catch (error) {
          alert(error.response?.data?.error || "Update failed");
      }
  };
  
  const handleDelete = async (id) => {
      if(!window.confirm("Are you sure you want to delete this document?")) return;
      
      try {
          const response = await axios.delete(`${API_BASE}/api/document/${id}`, {
              headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
          });
          if (response.data.success) {
              setDocuments(documents.filter(doc => doc._id !== id));
          }
      } catch (error) {
          alert(error.response?.data?.error || "Delete failed");
      }
  };

  const openStatusModal = (doc) => {
      setSelectedDoc(doc);
      setStatusComment(doc.comments || "");
  };

  const getFileUrl = (url) => {
      if (!url) return "#";
      if (url.startsWith("http://") || url.startsWith("https://")) {
          return url;
      }
      return `${API_BASE}${url}`;
  };

  const getFileIcon = (type) => {
      if (type && type.includes("pdf")) return <FaFilePdf className="text-red-500 text-2xl" />;
      if (type && type.includes("image")) return <FaFileImage className="text-blue-500 text-2xl" />;
      if (type && type.includes("word")) return <FaFileWord className="text-blue-700 text-2xl" />;
      return <FaFilePdf className="text-gray-500 text-2xl" />;
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
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-ink">
              {user?.role === 'employee' ? 'My Documents' : 'Employee Documents'}
          </h2>
          {user?.role === 'employee' && (
              <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-700 flex items-center gap-2 transition-colors"
              >
                  <FaUpload /> Upload Document
              </button>
          )}
      </div>

      {/* Search Filter - Only for Admin/Team Lead */}
      {user?.role !== 'employee' && (
          <div className="mb-4">
              <input
                type="text"
                placeholder="Search by Employee Name or ID..."
                className="w-full p-2.5 border border-surface-subtle rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              />
          </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-surface-subtle">
          <table className="min-w-full divide-y divide-surface-subtle">
              <thead className="bg-surface-muted sticky top-0">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Employee</th>
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
                        <SkeletonRow columns={9} />
                        <SkeletonRow columns={9} />
                        <SkeletonRow columns={9} />
                      </>
                  ) : filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan="9">
                          <EmptyState icon={FaFolderOpen} title="No documents found" message="No employee documents match the current filter." />
                        </td>
                      </tr>
                  ) : (
                      filteredDocuments.map((doc) => (
                          <tr key={doc._id} className="hover:bg-surface-muted">
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-ink">{doc.employeeId?.userId?.name || "Unknown"}</div>
                                  <div className="text-xs text-ink-muted">{doc.employeeId?.employeeId}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{getFileIcon(doc.fileType)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                                {doc.originalName}
                                {doc.version > 1 && <span className="ml-1.5 text-xs text-ink-faint">v{doc.version}</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">{doc.documentType || "Other"}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{getExpiryBadge(doc.expiryDate)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">{new Date(doc.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">{doc.comments || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <a href={getFileUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 mr-4" title="View">
                                      <FaEye className="inline" />
                                  </a>

                                  {user?.role !== 'employee' && (
                                      <button onClick={() => openStatusModal(doc)} className="text-accent-600 hover:text-accent-700 mr-4" title="Update Status">
                                          <FaEdit className="inline" />
                                      </button>
                                  )}

                                  {(user?.role === 'admin' || (user?.role === 'employee' && doc.status === 'Pending')) && (
                                      <button onClick={() => handleDelete(doc._id)} className="text-red-600 hover:text-red-700" title="Delete">
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

      {/* Upload Modal */}
      {showUploadModal && (
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl shadow-panel w-full max-w-sm max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4 text-ink">Upload Document</h3>
                  <form onSubmit={handleUploadSubmit}>
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-ink mb-1">Document Type</label>
                          <select
                            value={uploadDocType}
                            onChange={(e) => setUploadDocType(e.target.value)}
                            className="w-full border border-surface-subtle rounded-lg p-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
                          >
                            {DOCUMENT_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                      </div>
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-ink mb-1">Expiry Date (optional)</label>
                          <input
                            type="date"
                            value={uploadExpiryDate}
                            onChange={(e) => setUploadExpiryDate(e.target.value)}
                            className="w-full border border-surface-subtle rounded-lg p-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
                          />
                      </div>
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-ink mb-1">Select File</label>
                          <input
                            type="file"
                            onChange={handleFileChange}
                            className="w-full border border-surface-subtle rounded-lg p-2 text-ink"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            required
                          />
                          <p className="text-xs text-ink-muted mt-1">Allowed: PDF, Word, Images (Max 10MB)</p>
                      </div>

                      <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowUploadModal(false)}
                            className="px-4 py-2 border border-surface-subtle bg-white text-ink rounded-lg hover:bg-surface-muted"
                            disabled={uploadLoading}
                          >
                              Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                            disabled={uploadLoading}
                          >
                              {uploadLoading ? 'Uploading...' : 'Upload'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Status Modal */}
      {selectedDoc && (
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl shadow-panel w-full max-w-sm max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4 text-ink">Update Status</h3>
                  <p className="mb-2 text-sm text-ink-muted">File: {selectedDoc.originalName}</p>

                  <div className="mb-4">
                      <label className="block text-sm font-medium text-ink mb-1">Comments</label>
                      <textarea
                        className="w-full p-2.5 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                        rows="3"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="Reason for approval/rejection..."
                      ></textarea>
                  </div>

                  <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedDoc(null)}
                        className="px-4 py-2 border border-surface-subtle bg-white text-ink rounded-lg hover:bg-surface-muted"
                      >
                          Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedDoc._id, 'Rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                          Reject
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedDoc._id, 'Approved')}
                        className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
                      >
                          Approve
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DocumentList;
