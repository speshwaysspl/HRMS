import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiDownload, FiMinus, FiPlus, FiRotateCcw, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";
import { DEFAULT_ID_CARD_PHOTO, fileToIdCardPhoto, parseIdCardPhoto } from "../../utils/idCard";
import { IdCardBack, IdCardFront, ID_CARD_HEIGHT, ID_CARD_WIDTH } from "./IdCard";

const SCALE = 3; // capture resolution multiplier for print
const GAP = 32;
const MARGIN = 24;

/** Front + back side by side on one PDF page (cut along the card edges). */
const downloadIdCardPdf = async (nodes, filename) => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const images = [];
  for (const node of nodes) {
    const canvas = await html2canvas(node, { scale: SCALE, backgroundColor: "#ffffff", useCORS: true, logging: false });
    images.push(canvas.toDataURL("image/png"));
  }
  const width = MARGIN * 2 + images.length * ID_CARD_WIDTH + (images.length - 1) * GAP;
  const height = MARGIN * 2 + ID_CARD_HEIGHT;
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [width, height], hotfixes: ["px_scaling"] });
  images.forEach((img, i) => {
    pdf.addImage(img, "PNG", MARGIN + i * (ID_CARD_WIDTH + GAP), MARGIN, ID_CARD_WIDTH, ID_CARD_HEIGHT);
  });
  pdf.save(filename);
};

/**
 * Employee ID card.
 * - Admin/HR (`allowManage`): front + back, change photo, download a print-ready PDF.
 * - Employee: view-only front + back.
 */
const IdCardModal = ({ open, onClose, employee, allowManage = false, onPhotoChange }) => {
  const savedFit = parseIdCardPhoto(employee?.idCardPhoto);
  const [fit, setFit] = useState(savedFit);
  const fitDirty = fit.scale !== savedFit.scale || fit.x !== savedFit.x || fit.y !== savedFit.y;
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    setError("");
    setFit(parseIdCardPhoto(employee?.idCardPhoto));
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, employee?._id]);

  if (!open || !employee) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      const profileImage = await fileToIdCardPhoto(file);
      const res = await axios.put(
        `${API_BASE}/api/employee/${employee._id}/photo`,
        { profileImage },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      setFit(DEFAULT_ID_CARD_PHOTO);
      onPhotoChange?.(res.data.profileImage, res.data.idCardPhoto);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to upload photo");
    } finally {
      setBusy("");
    }
  };

  const removePhoto = async () => {
    if (!window.confirm("Remove this employee's photo? Initials will show on the ID card.")) return;
    setBusy("remove");
    setError("");
    try {
      const res = await axios.put(
        `${API_BASE}/api/employee/${employee._id}/photo`,
        { profileImage: "" },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      setFit(DEFAULT_ID_CARD_PHOTO);
      onPhotoChange?.(res.data.profileImage, res.data.idCardPhoto);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove photo");
    } finally {
      setBusy("");
    }
  };

  const saveFit = async () => {
    setBusy("fit");
    setError("");
    try {
      const res = await axios.put(
        `${API_BASE}/api/employee/${employee._id}/photo`,
        { idCardPhoto: fit },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      onPhotoChange?.(res.data.profileImage, res.data.idCardPhoto);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save photo position");
    } finally {
      setBusy("");
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    setError("");
    try {
      await downloadIdCardPdf([frontRef.current, backRef.current], `speshway-id-card-${employee.employeeId || "employee"}.pdf`);
    } catch {
      setError("Couldn't prepare the ID card for download. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Employee ID card"
        className="bg-white rounded-2xl shadow-panel w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-subtle">
          <h2 className="text-lg font-semibold text-ink">ID Card</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-5">
          {!employee.profileImage ? (
            <p className="mb-4 text-sm text-ink-muted bg-surface-muted rounded-lg px-3 py-2">
              {allowManage ? "No photo yet — initials are shown. Upload a photo before printing." : "Your photo hasn't been added yet. Ask HR to add it."}
            </p>
          ) : null}

          {/* Cards scroll sideways on narrow screens instead of shrinking (keeps the print layout exact). */}
          <div className="overflow-x-auto">
            <div className="flex gap-6 justify-center w-max mx-auto pb-2">
              <div className="text-center">
                <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2">Front</p>
                <IdCardFront
                  ref={frontRef}
                  employee={employee}
                  photoFit={fit}
                  photoEditable={allowManage && !!employee.profileImage}
                  onPhotoFitChange={setFit}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2">Back</p>
                <IdCardBack ref={backRef} employee={employee} />
              </div>
            </div>
          </div>

          {error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}

          {allowManage && employee.profileImage ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-ink-muted mr-1">Drag the photo to move it, scroll to zoom</span>
              {[
                { label: "Zoom out", icon: FiMinus, onClick: () => setFit((f) => parseIdCardPhoto({ ...f, scale: f.scale * 0.9 })) },
                { label: "Zoom in", icon: FiPlus, onClick: () => setFit((f) => parseIdCardPhoto({ ...f, scale: f.scale * 1.12 })) },
                { label: "Reset position", icon: FiRotateCcw, onClick: () => setFit(DEFAULT_ID_CARD_PHOTO) },
              ].map(({ label, icon: Icon, onClick }) => (
                <button key={label} type="button" onClick={onClick} aria-label={label} title={label} className="w-10 h-10 rounded-lg border border-surface-subtle flex items-center justify-center text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
                  <Icon size={15} />
                </button>
              ))}
              <button
                type="button"
                onClick={saveFit}
                disabled={!fitDirty || !!busy}
                className="px-4 h-10 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                {busy === "fit" ? "Saving…" : "Save position"}
              </button>
            </div>
          ) : null}

          {allowManage ? (
            <div className="mt-5 flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!!busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-surface-subtle text-ink font-medium hover:bg-surface-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <FiUpload size={15} /> {busy === "upload" ? "Uploading…" : employee.profileImage ? "Change photo" : "Upload photo"}
              </button>
              {employee.profileImage ? (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={!!busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <FiTrash2 size={15} /> {busy === "remove" ? "Removing…" : "Remove photo"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleDownload}
                disabled={!!busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-700 text-white font-medium hover:bg-brand-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <FiDownload size={15} /> {busy === "download" ? "Preparing…" : "Download ID card (PDF)"}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleFile} />
            </div>
          ) : (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!!busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-700 text-white font-medium hover:bg-brand-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <FiDownload size={15} /> {busy === "download" ? "Preparing…" : "Download ID card (PDF)"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdCardModal;
