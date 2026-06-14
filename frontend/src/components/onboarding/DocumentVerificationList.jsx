import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidateDocuments, verifyDocument } from "../../redux/slices/onboardingSlice";
import { toast } from "react-toastify";
import { FaFilter, FaSearch, FaEye, FaCheck, FaTimes, FaFileAlt } from "react-icons/fa";

const DocumentVerificationList = () => {
  const dispatch = useDispatch();
  const { documents, loading } = useSelector((state) => state.onboarding);

  const [statusFilter, setStatusFilter] = useState("Pending");
  const [search, setSearch] = useState("");
  const [commentText, setCommentText] = useState({});
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    // Fetch all documents
    dispatch(fetchCandidateDocuments());
  }, [dispatch]);

  const handleVerify = async (docId, status) => {
    const comment = commentText[docId] || "";
    if (status === "Rejected" && !comment.trim()) {
      toast.warning("Please provide a reason for rejecting the document!");
      return;
    }

    setProcessingId(docId);
    try {
      const resultAction = await dispatch(verifyDocument({ docId, status, comments: comment }));
      if (verifyDocument.fulfilled.match(resultAction)) {
        toast.success(`Document marked as ${status}`);
        setCommentText({ ...commentText, [docId]: "" });
        dispatch(fetchCandidateDocuments());
      } else {
        toast.error(resultAction.payload || "Action failed");
      }
    } catch (err) {
      toast.error("Error verifying document");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (statusVal) => {
    switch (statusVal) {
      case "Approved": return "bg-green-500/15 text-green-500 border-green-500/20";
      case "Rejected": return "bg-red-500/15 text-red-500 border-red-500/20";
      default: return "bg-yellow-500/15 text-yellow-500 border-yellow-500/20";
    }
  };

  // Filter local document list
  const filteredDocuments = documents?.filter((doc) => {
    const matchesStatus = statusFilter === "" || doc.status === statusFilter;
    const matchesSearch =
      search === "" ||
      doc.candidateId?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      doc.fileType?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Document Verification Center</h2>
        <p className="text-sm text-slate-500 mt-1">Review identity, education, and professional credentials uploaded by candidates.</p>
      </div>

      {/* Filters Row */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by candidate name or document type..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="relative col-span-2 md:col-span-1">
            <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 appearance-none bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Uploads</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-10 text-slate-500">
            <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading documents...
          </div>
        ) : filteredDocuments?.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400 font-medium text-sm">
            No onboarding documents found matching the selected filters.
          </div>
        ) : (
          filteredDocuments?.map((doc) => (
            <div
              key={doc._id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-lg">{doc.fileType}</h4>
                  <p className="text-xs text-slate-500">
                    Uploaded by: <b className="text-slate-700">{doc.candidateId?.fullName || "Candidate"}</b> ({doc.candidateId?.candidateId || "TBD"})
                  </p>
                  <p className="text-[10px] text-slate-400">File Name: {doc.originalName} | Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 self-start shrink-0"
                >
                  <FaEye /> View Document
                </a>
              </div>

              {/* Action area for processing review */}
              {doc.status === "Pending" && (
                <div className="flex flex-col md:flex-row items-center gap-4 border-t border-slate-100 pt-4 mt-2">
                  <input
                    type="text"
                    placeholder="Enter reason if rejecting this document..."
                    className="w-full md:flex-1 rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    value={commentText[doc._id] || ""}
                    onChange={(e) => setCommentText({ ...commentText, [doc._id]: e.target.value })}
                  />
                  <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                    <button
                      onClick={() => handleVerify(doc._id, "Rejected")}
                      disabled={processingId === doc._id}
                      className="flex-1 md:flex-none rounded-xl border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <FaTimes /> Reject
                    </button>
                    <button
                      onClick={() => handleVerify(doc._id, "Approved")}
                      disabled={processingId === doc._id}
                      className="flex-1 md:flex-none rounded-xl bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-green-500/10"
                    >
                      <FaCheck /> Approve
                    </button>
                  </div>
                </div>
              )}

              {doc.comments && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 mt-2">
                  <b>Review comment:</b> {doc.comments}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentVerificationList;
