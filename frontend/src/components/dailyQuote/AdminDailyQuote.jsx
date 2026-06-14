import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE, getAuthHeaders } from "../../utils/apiConfig";
import { 
  UploadCloud, 
  Image as ImageIcon, 
  FileImage, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Calendar, 
  X,
  RefreshCw,
  Trash2,
  Check,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminDailyQuote = () => {
  const [currentQuote, setCurrentQuote] = useState(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const [dragActive, setDragActive] = useState(false);
  
  // Gallery actions state
  const [actionId, setActionId] = useState(null); // ID of quote being deleted or activated
  const [actionType, setActionType] = useState(null); // 'delete', 'activate', 'editImage'
  const [actionLoading, setActionLoading] = useState(false);
  
  // Image editing states
  const [editFile, setEditFile] = useState(null);
  const [editFilePreview, setEditFilePreview] = useState(null);
  
  // Rescheduling states
  const [editingDateId, setEditingDateId] = useState(null);
  const [editDateVal, setEditDateVal] = useState("");
  
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  
  // Gallery Tab State
  const [activeTab, setActiveTab] = useState("live"); // 'live', 'scheduled', 'all'

  const fileInputRef = useRef(null);
  const cardFileInputRef = useRef(null);

  const fetchCurrentQuote = async () => {
    setLoadingCurrent(true);
    try {
      const response = await axios.get(`${API_BASE}/api/daily-quote`);
      if (response.data.success && response.data.quote) {
        setCurrentQuote(response.data.quote);
      } else {
        setCurrentQuote(null);
      }
    } catch (err) {
      console.error("Error fetching current quote:", err);
    } finally {
      setLoadingCurrent(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_BASE}/api/daily-quote/history`, {
        headers: getAuthHeaders(),
      });
      if (response.data.success && response.data.quotes) {
        setHistory(response.data.quotes);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshAll = () => {
    fetchCurrentQuote();
    fetchHistory();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    
    if (!selectedFile.type.startsWith("image/")) {
      setError("Only image files (JPEG, PNG, GIF, WebP) are allowed.");
      return false;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size exceeds the 5MB limit.");
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError("");
      setMessage("");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setError("");
        setMessage("");
      }
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setScheduledDate("");
    setError("");
    setMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    if (scheduledDate) {
      formData.append("scheduledDate", new Date(scheduledDate).toISOString());
    }

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
        setMessage(
          scheduledDate 
            ? "Daily quote scheduled successfully!" 
            : "Daily quote uploaded successfully!"
        );
        setFile(null);
        setPreview(null);
        setScheduledDate("");
        refreshAll();
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

  const initiateAction = (id, type) => {
    setActionId(id);
    setActionType(type);
    setEditingDateId(null); // Close date editor if open
    setEditFile(null);
    setEditFilePreview(null);
    setError("");
    setMessage("");
  };

  const cancelAction = () => {
    setActionId(null);
    setActionType(null);
    setEditFile(null);
    setEditFilePreview(null);
  };

  const initiateEditImage = (id) => {
    setActionId(id);
    setActionType("editImage");
    setEditingDateId(null);
    setEditFile(null);
    setEditFilePreview(null);
    setError("");
    setMessage("");
  };

  const cancelEditImage = () => {
    setActionId(null);
    setActionType(null);
    setEditFile(null);
    setEditFilePreview(null);
  };

  const handleEditFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        setError("Only image files (JPEG, PNG, GIF, WebP) are allowed.");
        cancelEditImage();
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit.");
        cancelEditImage();
        return;
      }
      setEditFile(selectedFile);
      setEditFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const executeAction = async () => {
    if (!actionId || !actionType) return;
    
    setActionLoading(true);
    setError("");
    setMessage("");
    
    try {
      if (actionType === "delete") {
        const response = await axios.delete(`${API_BASE}/api/daily-quote/${actionId}`, {
          headers: getAuthHeaders(),
        });
        if (response.data.success) {
          setMessage("Quote deleted successfully.");
          refreshAll();
        } else {
          setError("Failed to delete quote.");
        }
      } else if (actionType === "activate") {
        const response = await axios.patch(
          `${API_BASE}/api/daily-quote/${actionId}/activate`,
          {},
          { headers: getAuthHeaders() }
        );
        if (response.data.success) {
          setMessage("Quote set as active successfully.");
          refreshAll();
        } else {
          setError("Failed to activate quote.");
        }
      }
    } catch (err) {
      console.error("Action error:", err);
      setError(`Server error during ${actionType} operation.`);
    } finally {
      setActionLoading(false);
      cancelAction();
    }
  };

  const handleUpdateImage = async (id) => {
    if (!editFile) return;
    setActionLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("image", editFile);

    try {
      const response = await axios.patch(
        `${API_BASE}/api/daily-quote/${id}/image`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setMessage("Quote banner image updated successfully.");
        cancelEditImage();
        refreshAll();
      } else {
        setError("Failed to replace image.");
      }
    } catch (err) {
      console.error("Image replace error:", err);
      setError("Server error replacing quote banner image.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDate = async (id) => {
    if (!editDateVal) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await axios.patch(
        `${API_BASE}/api/daily-quote/${id}/date`,
        { date: new Date(editDateVal).toISOString() },
        { headers: getAuthHeaders() }
      );
      if (response.data.success) {
        setMessage("Quote publish schedule updated successfully.");
        setEditingDateId(null);
        refreshAll();
      } else {
        setError("Failed to update quote schedule date.");
      }
    } catch (err) {
      console.error("Date update error:", err);
      setError("Server error updating quote schedule date.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await axios.delete(`${API_BASE}/api/daily-quote`, {
        headers: getAuthHeaders(),
      });
      if (response.data.success) {
        setMessage("All daily quotes deleted successfully.");
        refreshAll();
      } else {
        setError("Failed to delete all daily quotes.");
      }
    } catch (err) {
      console.error("Delete all error:", err);
      setError("Server error during bulk delete operation.");
    } finally {
      setActionLoading(false);
      setConfirmDeleteAll(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Convert Date object to local ISO string (YYYY-MM-DDTHH:MM) for datetime-local value format
  const toLocalDateTimeString = (dateInput) => {
    const d = new Date(dateInput);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  };

  // Filtering variables for tabs
  const now = new Date();
  const liveQuoteItem = history.find(item => new Date(item.createdAt) <= now);
  const liveCount = liveQuoteItem ? 1 : 0;
  const scheduledCount = history.filter(item => new Date(item.createdAt) > now).length;

  const getFilteredHistory = () => {
    const today = new Date();
    if (activeTab === "live") {
      return liveQuoteItem ? [liveQuoteItem] : [];
    }
    if (activeTab === "scheduled") {
      return history.filter(item => new Date(item.createdAt) > today);
    }
    return history;
  };

  const filteredHistory = getFilteredHistory();

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-700 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-teal-300 animate-pulse" />
                Featured Banner
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Manage Daily HR Quote</h1>
            <p className="mt-2 text-blue-100 max-w-xl text-sm sm:text-base">
              Inspire your team with scheduled daily banner quotes. Banners appear dynamically on the employee dashboard once their schedule time arrives.
            </p>
          </div>
          <button 
            onClick={refreshAll}
            className="self-start md:self-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/25 rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loadingCurrent || loadingHistory ? "animate-spin" : ""}`} />
            Refresh All
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Current Active Quote Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <span className="font-bold text-gray-700 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-600" />
                Current Active Quote
              </span>
              {currentQuote && (
                <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm relative">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Live
                </span>
              )}
            </div>

            <div className="p-6 flex-grow flex flex-col justify-between min-h-[300px]">
              {loadingCurrent ? (
                <div className="space-y-4 w-full flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                  <p className="text-sm text-gray-500 font-medium animate-pulse">Loading live quote data...</p>
                </div>
              ) : currentQuote ? (
                <div className="space-y-6 flex-grow flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="relative group overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-md transition-all duration-300 hover:shadow-xl">
                      <img 
                        src={currentQuote.imageUrl.startsWith("http") ? currentQuote.imageUrl : `${API_BASE}${currentQuote.imageUrl}`} 
                        alt="Current Daily Quote" 
                        className="w-full h-auto max-h-[260px] object-contain mx-auto block transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <p className="text-white text-xs font-medium">Currently Active Quote Banner</p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <span>Uploaded on:</span>
                        <strong className="text-gray-800 ml-auto">{formatDate(currentQuote.createdAt)}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FileImage className="h-4 w-4 text-indigo-500" />
                        <span>Image File:</span>
                        <strong className="text-gray-800 truncate max-w-[180px] ml-auto" title={currentQuote.imageUrl}>
                          {currentQuote.imageUrl.split('/').pop()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* CRUD: Edit & Delete directly on active card */}
                  <div className="pt-4 border-t border-gray-100">
                    {actionId === currentQuote._id && actionType === "delete" ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center flex flex-col items-center justify-center relative">
                        <p className="text-xs font-semibold text-red-800 mb-2.5">Delete this active quote?</p>
                        <div className="flex gap-2">
                          <button
                            disabled={actionLoading}
                            onClick={executeAction}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition active:scale-95 flex items-center gap-1 shadow-sm"
                          >
                            {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                            Confirm Delete
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={cancelAction}
                            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : actionId === currentQuote._id && actionType === "editImage" ? (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center flex flex-col items-center justify-center relative">
                        <p className="text-xs font-semibold text-indigo-850 mb-2 flex items-center gap-1 justify-center">
                          <ImageIcon className="h-4 w-4 text-indigo-600 animate-pulse" />
                          Replace Active Image
                        </p>

                        {!editFilePreview ? (
                          <div 
                            onClick={() => cardFileInputRef.current.click()}
                            className="w-full py-4 border border-dashed border-indigo-300 rounded-xl flex flex-col items-center justify-center bg-white hover:bg-indigo-50/50 cursor-pointer p-2 text-indigo-600 transition"
                          >
                            <UploadCloud className="h-5 w-5 mb-1 text-indigo-500" />
                            <span className="text-[10px] font-bold">Click to select new image</span>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center gap-2 mb-2">
                            <img 
                              src={editFilePreview} 
                              alt="Edit Preview" 
                              className="h-16 w-auto object-contain rounded border border-indigo-150 shadow" 
                            />
                            <span className="text-[10px] text-indigo-700 font-semibold truncate max-w-[180px]">{editFile?.name}</span>
                          </div>
                        )}

                        <div className="flex gap-2 w-full justify-center mt-2">
                          <button
                            disabled={actionLoading || !editFile}
                            onClick={() => handleUpdateImage(currentQuote._id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1 active:scale-95 transition shadow-sm
                              ${!editFile 
                                ? "bg-slate-300 text-white cursor-not-allowed shadow-none" 
                                : "bg-indigo-600 hover:bg-indigo-700"}`}
                          >
                            {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Change"}
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={cancelEditImage}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => initiateEditImage(currentQuote._id)}
                          className="flex-1 py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Sparkles className="h-4 w-4" />
                          Edit Image
                        </button>
                        <button
                          type="button"
                          onClick={() => initiateAction(currentQuote._id, "delete")}
                          className="flex-1 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-750 border border-red-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl py-12 my-auto">
                  <div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4 shadow-inner">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">No Active Quote Found</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-[240px]">
                    Upload or schedule a quote banner to inspire your team on the landing page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Upload & Scheduler Box */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-600" />
                Upload & Schedule Banner
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Drag quote images here, or browse. Schedule your quotes to display dynamically on key dates.
              </p>
            </div>

            {/* Notifications */}
            <AnimatePresence mode="wait">
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-start gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Success</h4>
                    <p className="text-xs text-green-700/90 mt-0.5">{message}</p>
                  </div>
                </motion.div>
              )}
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Upload Error</h4>
                    <p className="text-xs text-red-700/90 mt-0.5">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spec Warning */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/50 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Banner Specifications:</span> 16:9 ratio is highly recommended for best representation on desktop. JPG, PNG, GIF, WebP are accepted up to 5MB.
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              {/* Drag and Drop Container */}
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group min-h-[180px]
                  ${dragActive 
                    ? "border-indigo-600 bg-indigo-50/40 text-indigo-700" 
                    : preview 
                      ? "border-gray-200 bg-gray-50 hover:bg-gray-100/50 text-gray-500" 
                      : "border-gray-300 hover:border-indigo-500 bg-gray-50/50 hover:bg-gray-50 text-gray-500"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!preview ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition duration-300 shadow-sm">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        Drag & drop your file here, or <span className="text-indigo-600 group-hover:underline">browse</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Only image formats allowed (Max 5MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full relative py-2 space-y-4">
                    <div className="relative inline-block mx-auto max-w-full">
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="max-h-[140px] w-auto object-contain rounded-lg shadow-md border border-gray-200" 
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClear();
                        }}
                        className="absolute -top-2.5 -right-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md hover:scale-110 active:scale-95 transition cursor-pointer z-10"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="bg-white px-4 py-2 border border-gray-150 rounded-xl inline-flex items-center gap-2 text-xs text-gray-600 shadow-sm max-w-full">
                      <FileImage className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="font-medium truncate max-w-[180px]">{file.name}</span>
                      <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule Input */}
              <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl space-y-2.5">
                <label className="block text-xs font-bold text-gray-750 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  Schedule Publication Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
                />
                <p className="text-[10px] text-gray-400">
                  Leave empty to publish immediately, or specify a future release time.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {preview && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Clear
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className={`flex-[2] py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2
                    ${uploading 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : !file 
                        ? "bg-gray-300 cursor-not-allowed shadow-none" 
                        : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-600/20"
                    }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading Banner...
                    </>
                  ) : scheduledDate ? (
                    "Schedule Publication"
                  ) : (
                    "Publish Daily Quote"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* History Gallery */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-600" />
              Daily Quote Gallery & History
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage scheduled or past quote banners. You can edit images, reschedule dates, force activate banners, or delete them permanently.
            </p>
          </div>
          {history.length > 0 && (
            <div className="relative shrink-0">
              {confirmDeleteAll ? (
                <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-200">
                  <span className="text-xs text-red-700 font-bold px-2">Purge all quotes?</span>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleDeleteAll}
                    className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 flex items-center gap-1"
                  >
                    {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Yes, Purge
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setConfirmDeleteAll(false)}
                    className="py-1 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteAll(true);
                    setError("");
                    setMessage("");
                  }}
                  className="w-full sm:w-auto py-2 px-4 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-700 text-xs font-bold rounded-xl transition border border-red-200 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All Banners
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Category Tabs */}
        {history.length > 0 && (
          <div className="flex flex-wrap border-b border-gray-100 gap-4 sm:gap-6 text-sm font-medium pt-2 pb-1">
            <button
              onClick={() => {
                setActiveTab("live");
                cancelAction();
                setEditingDateId(null);
              }}
              className={`pb-3 relative flex items-center gap-1.5 transition-colors focus:outline-none cursor-pointer
                ${activeTab === "live" ? "text-indigo-650 font-bold" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Play className="h-4 w-4 shrink-0 fill-current" />
              Live
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                ${activeTab === "live" ? "bg-indigo-100 text-indigo-700" : "bg-gray-150 text-gray-500"}`}>
                {liveCount}
              </span>
              {activeTab === "live" && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-650" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("scheduled");
                cancelAction();
                setEditingDateId(null);
              }}
              className={`pb-3 relative flex items-center gap-1.5 transition-colors focus:outline-none cursor-pointer
                ${activeTab === "scheduled" ? "text-indigo-650 font-bold" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              Scheduled
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                ${activeTab === "scheduled" ? "bg-indigo-100 text-indigo-700" : "bg-gray-150 text-gray-500"}`}>
                {scheduledCount}
              </span>
              {activeTab === "scheduled" && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-650" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("all");
                cancelAction();
                setEditingDateId(null);
              }}
              className={`pb-3 relative flex items-center gap-1.5 transition-colors focus:outline-none cursor-pointer
                ${activeTab === "all" ? "text-indigo-650 font-bold" : "text-gray-500 hover:text-gray-700"}`}
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              All Banners
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                ${activeTab === "all" ? "bg-indigo-100 text-indigo-700" : "bg-gray-150 text-gray-500"}`}>
                {history.length}
              </span>
              {activeTab === "all" && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-650" />
              )}
            </button>
          </div>
        )}

        {loadingHistory ? (
          <div className="space-y-4 w-full flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-500 font-medium animate-pulse">Loading gallery records...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredHistory.map((item) => {
              const isActive = currentQuote && currentQuote._id === item._id;
              const isScheduled = new Date(item.createdAt) > new Date();
              const isPendingAction = actionId === item._id;
              const isEditingDate = editingDateId === item._id;
              const isEditingImage = actionType === "editImage" && actionId === item._id;
              
              return (
                <div 
                  key={item._id}
                  className={`relative overflow-hidden rounded-xl border transition-all duration-300 bg-white flex flex-col justify-between group min-h-[220px]
                    ${isActive 
                      ? "border-green-300 ring-2 ring-green-500/20 shadow-md" 
                      : isScheduled
                        ? "border-blue-200 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                    }`}
                >
                  {/* Image Frame */}
                  <div className="relative aspect-video bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                    <img 
                      src={item.imageUrl.startsWith("http") ? item.imageUrl : `${API_BASE}${item.imageUrl}`} 
                      alt="Gallery quote" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Status Ribbon badges */}
                    {isActive ? (
                      <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1 z-10">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : isScheduled ? (
                      <span className="absolute top-2 left-2 bg-indigo-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1 z-10 shadow-indigo-500/30">
                        <Calendar className="h-3 w-3" />
                        Scheduled
                      </span>
                    ) : null}

                    {/* Action Dialog Overlay inside card */}
                    <AnimatePresence>
                      {isPendingAction && actionType !== "editImage" && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center text-white z-20"
                        >
                          <p className="text-xs font-semibold mb-3">
                            {actionType === "delete" 
                              ? "Delete this banner permanently?" 
                              : "Set this banner as live active quote?"}
                          </p>
                          <div className="flex gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={executeAction}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1 active:scale-95 transition
                                ${actionType === "delete" 
                                  ? "bg-red-500 hover:bg-red-600" 
                                  : "bg-indigo-600 hover:bg-indigo-700"}`}
                            >
                              {actionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Confirm"
                              )}
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={cancelAction}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Reschedule Overlay inside card */}
                    <AnimatePresence>
                      {isEditingDate && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center text-white z-20"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-1.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Reschedule Publish
                          </p>
                          <input
                            type="datetime-local"
                            value={editDateVal}
                            onChange={(e) => setEditDateVal(e.target.value)}
                            className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 mb-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateDate(item._id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition active:scale-95 flex items-center gap-1"
                            >
                              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => setEditingDateId(null)}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition active:scale-95"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Edit Image Overlay inside card */}
                    <AnimatePresence>
                      {isEditingImage && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center text-white z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Replace Image
                          </p>

                          {!editFilePreview ? (
                            <div 
                              onClick={() => cardFileInputRef.current.click()}
                              className="w-full aspect-video border border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 cursor-pointer p-2 text-slate-300 transition-colors"
                            >
                              <UploadCloud className="h-5 w-5 mb-1 text-slate-400" />
                              <span className="text-[9px] font-bold">Click to select image</span>
                              <span className="text-[7px] text-slate-500">Max 5MB</span>
                            </div>
                          ) : (
                            <div className="w-full flex flex-col items-center gap-1">
                              <img 
                                src={editFilePreview} 
                                alt="Edit Preview" 
                                className="h-12 w-auto object-contain rounded border border-slate-700 shadow" 
                              />
                              <span className="text-[8px] text-slate-400 truncate max-w-[120px]">{editFile?.name}</span>
                            </div>
                          )}

                          <div className="flex gap-2 mt-3 w-full justify-center">
                            <button
                              disabled={actionLoading || !editFile}
                              onClick={() => handleUpdateImage(item._id)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 active:scale-95 transition
                                ${!editFile 
                                  ? "bg-slate-700 text-slate-500 cursor-not-allowed" 
                                  : "bg-indigo-600 hover:bg-indigo-700"}`}
                            >
                              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={cancelEditImage}
                              className="px-3 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Card Bottom details */}
                  <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-gray-400 truncate" title={item.imageUrl.split('/').pop()}>
                        {item.imageUrl.split('/').pop()}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>
                          {isScheduled ? "Scheduled for:" : "Published:"}
                        </span>
                        <strong className="text-gray-700 font-semibold truncate ml-auto">
                          {formatDate(item.createdAt)}
                        </strong>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    {!isPendingAction && !isEditingDate && !isEditingImage && (
                      <div className="flex gap-2 pt-2 border-t border-gray-50">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => initiateAction(item._id, "activate")}
                            className="flex-grow py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                            title="Set Active Now"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Activate
                          </button>
                        ) : (
                          <div className="flex-grow py-1.5 px-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 border border-green-100 cursor-default select-none">
                            <Check className="h-3.5 w-3.5" />
                            Live
                          </div>
                        )}
                        
                        {/* Edit Image Button */}
                        <button
                          type="button"
                          onClick={() => initiateEditImage(item._id)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-750 rounded-lg transition-colors"
                          title="Edit Image Banner"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>

                        {/* Reschedule Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDateId(item._id);
                            setEditDateVal(toLocalDateTimeString(item.createdAt));
                            setError("");
                            setMessage("");
                          }}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded-lg transition-colors"
                          title="Reschedule / Edit Date"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => initiateAction(item._id, "delete")}
                          className="p-1.5 bg-red-50 hover:bg-red-105 text-red-655 hover:text-red-750 rounded-lg transition-colors"
                          title="Delete Banner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 border border-gray-150 rounded-2xl py-12">
            <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
            <h3 className="font-bold text-gray-800 text-md">
              {activeTab === "live" 
                ? "No live quote found" 
                : activeTab === "scheduled" 
                  ? "No scheduled quotes found" 
                  : "No quotes in history"}
            </h3>
            <p className="text-xs text-gray-450 mt-1 max-w-[240px]">
              {activeTab === "live" 
                ? "The currently active/live banner quote will display here." 
                : activeTab === "scheduled" 
                  ? "Schedule a banner above to see it appear in this category." 
                  : "Uploaded quotes will be stored in your gallery history here."}
            </p>
          </div>
        )}
      </div>

      {/* Hidden card file input */}
      <input
        ref={cardFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleEditFileChange}
        className="hidden"
      />

    </div>
  );
};

export default AdminDailyQuote;
