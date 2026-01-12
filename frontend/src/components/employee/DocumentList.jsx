import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { FaFilePdf, FaFileImage, FaFileWord, FaEye, FaUpload, FaTrash } from "react-icons/fa";

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
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/document`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

    setUploadLoading(true);
    try {
        const response = await axios.post(`${API_BASE}/api/document/upload`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (response.data.success) {
            setDocuments([response.data.document, ...documents]);
            setShowUploadModal(false);
            setUploadFile(null);
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
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
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
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
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

  const getStatusBadge = (status) => {
      switch(status) {
          case 'Approved': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Approved</span>;
          case 'Rejected': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Rejected</span>;
          default: return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Pending</span>;
      }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
              {user?.role === 'employee' ? 'My Documents' : 'Employee Documents'}
          </h2>
          {user?.role === 'employee' && (
              <button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 flex items-center gap-2"
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
                className="w-full p-2 border border-gray-300 rounded-md"
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              />
          </div>
      )}

      <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                      <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                  ) : filteredDocuments.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-4">No documents found</td></tr>
                  ) : (
                      filteredDocuments.map((doc) => (
                          <tr key={doc._id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{doc.employeeId?.userId?.name || "Unknown"}</div>
                                  <div className="text-xs text-gray-500">{doc.employeeId?.employeeId}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{getFileIcon(doc.fileType)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.originalName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.comments || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <a href={getFileUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 mr-4" title="View">
                                      <FaEye className="inline" />
                                  </a>
                                  
                                  {user?.role !== 'employee' && (
                                      <button onClick={() => openStatusModal(doc)} className="text-teal-600 hover:text-teal-900 mr-4" title="Update Status">
                                          Edit Status
                                      </button>
                                  )}
                                  
                                  {(user?.role === 'admin' || (user?.role === 'employee' && doc.status === 'Pending')) && (
                                      <button onClick={() => handleDelete(doc._id)} className="text-red-600 hover:text-red-900" title="Delete">
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                  <h3 className="text-lg font-bold mb-4">Upload Document</h3>
                  <form onSubmit={handleUploadSubmit}>
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
                          <input 
                            type="file" 
                            onChange={handleFileChange}
                            className="w-full border border-gray-300 rounded p-2"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Allowed: PDF, Word, Images (Max 10MB)</p>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                          <button 
                            type="button"
                            onClick={() => setShowUploadModal(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                            disabled={uploadLoading}
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit"
                            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                  <h3 className="text-lg font-bold mb-4">Update Status</h3>
                  <p className="mb-2 text-sm text-gray-600">File: {selectedDoc.originalName}</p>
                  
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                      <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows="3"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="Reason for approval/rejection..."
                      ></textarea>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedDoc(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(selectedDoc._id, 'Rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                          Reject
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(selectedDoc._id, 'Approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
