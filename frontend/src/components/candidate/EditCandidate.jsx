import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateCandidate } from "../../redux/slices/candidateSlice";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toast } from "react-toastify";
import { FaUserEdit, FaTimes } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";


const EditCandidate = ({ candidate, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    position: "",
    department: "",
    expectedJoiningDate: "",
    status: "",
    password: "",
    interviewDate: "",
    zoomMeetingLink: ""
  });

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  const formatDateForDateTimeInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const pad = (num) => String(num).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    // Fetch departments for dropdown
    const fetchDepts = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/department`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setDepartments(res.data.departments || []);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    if (candidate) {
      setForm({
        fullName: candidate.fullName || "",
        email: candidate.email || "",
        mobileNumber: candidate.mobileNumber || "",
        position: candidate.position || "",
        department: candidate.department?._id || candidate.department || "",
        expectedJoiningDate: formatDateForInput(candidate.expectedJoiningDate),
        status: candidate.status || "Applied",
        password: "",
        interviewDate: formatDateForDateTimeInput(candidate.interviewDate),
        zoomMeetingLink: candidate.zoomMeetingLink || ""
      });
    }
  }, [candidate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.mobileNumber || !form.position || !form.department || !form.status) {
      toast.warning("Please fill in all required fields!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.keys(form).forEach((key) => {
      if (key === "password" && !form[key]) return; // Skip empty password field
      formData.append(key, form[key]);
    });

    try {
      const resultAction = await dispatch(updateCandidate({ id: candidate._id, formData }));
      if (updateCandidate.fulfilled.match(resultAction)) {
        toast.success("Candidate updated successfully!");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        toast.error(resultAction.payload || "Failed to update candidate");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <FaTimes size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <FaUserEdit size={22} />
          </div>
          <h3 className="text-xl font-bold text-white">Edit Candidate Details</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Full Name *</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 text-sm"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Email Address *</label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 text-sm"
                placeholder="john.doe@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mobile Number *</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 text-sm"
                placeholder="9876543210"
                value={form.mobileNumber}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Position / Title *</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 text-sm"
                placeholder="e.g. Full Stack Developer"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Department *</label>
              <select
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 text-sm"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="" disabled className="bg-slate-950">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id} className="bg-slate-950">{d.dep_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Expected Joining Date</label>
              <input
                type="date"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 text-sm"
                value={form.expectedJoiningDate}
                onChange={(e) => setForm({ ...form, expectedJoiningDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Status *</label>
              <select
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Applied" className="bg-slate-950">Applied</option>
                <option value="Screening" className="bg-slate-950">Screening</option>
                <option value="Interview Scheduled" className="bg-slate-950">Interview Scheduled</option>
                <option value="Interview Completed" className="bg-slate-950">Interview Completed</option>
                <option value="Selected" className="bg-slate-950">Selected</option>
                <option value="Pre-Onboarding" className="bg-slate-950">Pre-Onboarding</option>
                <option value="Offer Sent" className="bg-slate-950">Offer Sent</option>
                <option value="Offer Accepted" className="bg-slate-950">Offer Accepted</option>
                <option value="Employee Created" className="bg-slate-950">Employee Created</option>
              </select>
            </div>
            {form.status === "Interview Scheduled" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Interview Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 text-sm"
                    value={form.interviewDate}
                    onChange={(e) => setForm({ ...form, interviewDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Zoom Meeting Link *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://zoom.us/j/..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 text-sm"
                    value={form.zoomMeetingLink}
                    onChange={(e) => setForm({ ...form, zoomMeetingLink: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Password (Leave blank to keep unchanged)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 pl-4 pr-10 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 text-sm"
                  placeholder="Enter New Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-300 hover:bg-white/5 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 font-semibold text-white transition text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? "Updating candidate..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCandidate;
