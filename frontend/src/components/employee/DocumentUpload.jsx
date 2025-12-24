import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { FaFileUpload, FaTrash, FaFilePdf, FaFileImage, FaFileWord, FaDownload, FaEye } from "react-icons/fa";

const DocumentUpload = () => {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/document/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.success) {
        setDocuments([response.data.document, ...documents]);
        setFile(null);
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  const getStatusBadge = (status) => {
      switch(status) {
          case 'Approved': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Approved</span>;
          case 'Rejected': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Rejected</span>;
          default: return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Pending</span>;
      }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">My Documents</h2>
      
      {/* Upload Section */}
      <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
        <form onSubmit={handleUpload} className="flex flex-col items-center gap-4">
            <input 
                type="file" 
                id="fileInput"
                onChange={handleFileChange} 
                className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-teal-50 file:text-teal-700
                hover:file:bg-teal-100"
            />
            <button 
                type="submit" 
                disabled={uploading || !file}
                className={`px-6 py-2 rounded-lg text-white font-medium transition-colors
                    ${uploading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}
                `}
            >
                {uploading ? "Uploading..." : "Upload Document"}
            </button>
        </form>
      </div>

      {/* Documents List */}
      <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
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
                      <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
                  ) : documents.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-4">No documents uploaded</td></tr>
                  ) : (
                      documents.map((doc) => (
                          <tr key={doc._id}>
                              <td className="px-6 py-4 whitespace-nowrap">{getFileIcon(doc.fileType)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.originalName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.comments || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <a href={`${API_BASE}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 mr-4">
                                      <FaEye className="inline" />
                                  </a>
                                  {doc.status === 'Pending' && (
                                      <button onClick={() => handleDelete(doc._id)} className="text-red-600 hover:text-red-900">
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
