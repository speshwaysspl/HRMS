import React, { useState } from "react";
import axios from "axios";
import { API_BASE, getAuthHeaders } from "../../utils/apiConfig";

const AdminDailyQuote = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError("");
      setMessage("");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post(
        `${API_BASE}/api/daily-quote`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setMessage("Daily quote uploaded successfully!");
        setFile(null);
        setPreview(null);
      } else {
        setError("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while uploading.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-sm mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Manage Daily HR Quote</h2>
      
      {message && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{message}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {preview && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Preview:</p>
            <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-md shadow" />
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-2 px-4 rounded text-white font-bold transition
            ${uploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {uploading ? "Uploading..." : "Upload Quote Image"}
        </button>
      </form>
    </div>
  );
};

export default AdminDailyQuote;
