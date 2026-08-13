import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCandidateDocuments, verifyDocument } from "../../redux/slices/onboardingSlice";
import { toast } from "react-toastify";
import { FaFilter, FaSearch, FaEye, FaCheck, FaTimes, FaUserCircle, FaTimes as FaClose } from "react-icons/fa";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const getStatusColor = (statusVal) => {
  switch (statusVal) {
    case "Approved": return "bg-accent-100 text-accent-700";
    case "Rejected": return "bg-red-100 text-red-700";
    default: return "bg-amber-100 text-amber-700";
  }
};

// A candidate group's overall status: Pending if any doc pending, Rejected if any rejected (and none pending), else Approved.
const getGroupStatus = (docs) => {
  if (docs.some((d) => d.status === "Pending")) return "Pending";
  if (docs.some((d) => d.status === "Rejected")) return "Rejected";
  return "Approved";
};

const DocumentVerificationList = () => {
  const dispatch = useDispatch();
  const { documents, loading } = useSelector((state) => state.onboarding);

  const [statusFilter, setStatusFilter] = useState("Pending");
  const [search, setSearch] = useState("");
  const [commentText, setCommentText] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [activeCandidateId, setActiveCandidateId] = useState(null);

  useEffect(() => {
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

  // Group flat documents into per-candidate buckets
  const candidateGroups = useMemo(() => {
    const map = new Map();
    (documents || []).forEach((doc) => {
      const cand = doc.candidateId;
      const key = cand?._id || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          candidate: cand,
          docs: [],
        });
      }
      map.get(key).docs.push(doc);
    });
    return Array.from(map.values());
  }, [documents]);

  const filteredGroups = candidateGroups.filter(({ candidate, docs }) => {
    const groupStatus = getGroupStatus(docs);
    const matchesStatus = statusFilter === "" || groupStatus === statusFilter;
    const matchesSearch =
      search === "" ||
      candidate?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      candidate?.position?.toLowerCase().includes(search.toLowerCase()) ||
      docs.some((d) => d.fileType?.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const activeGroup = candidateGroups.find((g) => (g.candidate?._id || "unknown") === activeCandidateId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Document Verification Center</h2>
        <p className="text-sm text-ink-muted mt-1">Review identity, education, and professional credentials uploaded by candidates.</p>
      </div>

      {/* Filters Row */}
      <div className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
            <input
              type="text"
              placeholder="Search by candidate name or document type..."
              className="w-full rounded-lg border border-surface-subtle pl-10 pr-4 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-brand-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative col-span-2 md:col-span-1">
            <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={14} />
            <select
              className="w-full rounded-lg border border-surface-subtle pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-brand-500 appearance-none bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Candidates</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Has Rejected Docs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <LoadingState message="Loading documents..." />
        ) : filteredGroups.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-surface-subtle bg-white">
            <EmptyState title="No candidates found" message="No onboarding documents match the selected filters." />
          </div>
        ) : (
          filteredGroups.map(({ candidate, docs }) => {
            const groupStatus = getGroupStatus(docs);
            const pendingCount = docs.filter((d) => d.status === "Pending").length;
            const key = candidate?._id || "unknown";
            return (
              <button
                key={key}
                onClick={() => setActiveCandidateId(key)}
                className="text-left rounded-xl border border-surface-subtle bg-white p-5 shadow-card space-y-3 hover:border-brand-300 hover:shadow-panel transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
                      <FaUserCircle size={22} />
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-ink truncate">{candidate?.fullName || "Candidate"}</h4>
                      <p className="text-xs text-ink-muted truncate">{candidate?.candidateId || "TBD"}{candidate?.position ? ` · ${candidate.position}` : ""}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${getStatusColor(groupStatus)}`}>
                    {groupStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-ink-muted border-t border-surface-subtle pt-3">
                  <span>{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
                  {pendingCount > 0 && (
                    <span className="text-amber-700 font-medium">{pendingCount} pending</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Candidate Document Modal */}
      {activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60" onClick={() => setActiveCandidateId(null)}>
          <div
            className="bg-white rounded-xl shadow-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-surface-subtle sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-ink">{activeGroup.candidate?.fullName || "Candidate"}</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {activeGroup.candidate?.candidateId || "TBD"}{activeGroup.candidate?.position ? ` · ${activeGroup.candidate.position}` : ""}
                </p>
              </div>
              <button
                onClick={() => setActiveCandidateId(null)}
                className="text-ink-muted hover:text-ink flex-shrink-0"
                aria-label="Close"
              >
                <FaClose size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {activeGroup.docs.map((doc) => (
                <div
                  key={doc._id}
                  className="rounded-xl border border-surface-subtle p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                    <div className="space-y-1 min-w-0">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                      <h4 className="font-semibold text-ink break-words">{doc.fileType}</h4>
                      <p className="text-[11px] text-ink-faint break-words">File Name: {doc.originalName} | Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-surface-subtle bg-white hover:bg-surface-muted px-4 py-2 text-xs font-medium text-ink transition-colors flex items-center gap-1.5 self-start shrink-0"
                    >
                      <FaEye /> View Document
                    </a>
                  </div>

                  {doc.status === "Pending" && (
                    <div className="flex flex-col md:flex-row items-center gap-3 border-t border-surface-subtle pt-3">
                      <input
                        type="text"
                        placeholder="Enter reason if rejecting this document..."
                        className="w-full md:flex-1 rounded-lg border border-surface-subtle px-4 py-2 text-xs text-ink outline-none focus:border-brand-500"
                        value={commentText[doc._id] || ""}
                        onChange={(e) => setCommentText({ ...commentText, [doc._id]: e.target.value })}
                      />
                      <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => handleVerify(doc._id, "Rejected")}
                          disabled={processingId === doc._id}
                          className="flex-1 md:flex-none rounded-lg border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <FaTimes /> Reject
                        </button>
                        <button
                          onClick={() => handleVerify(doc._id, "Approved")}
                          disabled={processingId === doc._id}
                          className="flex-1 md:flex-none rounded-lg bg-accent-600 hover:bg-accent-700 text-white px-5 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <FaCheck /> Approve
                        </button>
                      </div>
                    </div>
                  )}

                  {doc.comments && (
                    <div className="bg-surface-muted rounded-lg p-3 border border-surface-subtle text-xs text-ink-muted break-words">
                      <b className="text-ink">Review comment:</b> {doc.comments}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVerificationList;
