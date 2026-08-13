import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createCandidate } from "../../redux/slices/candidateSlice";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toast } from "react-toastify";
import { FaUserPlus, FaTimes } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";

const AddCandidate = ({ onClose, onSuccess }) => {
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
    password: ""
  });

  useEffect(() => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.mobileNumber || !form.position || !form.department || !form.password) {
      toast.warning("Please fill in all required fields!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.keys(form).forEach((key) => {
      formData.append(key, form[key]);
    });

    try {
      const resultAction = await dispatch(createCandidate(formData));
      if (createCandidate.fulfilled.match(resultAction)) {
        toast.success("Candidate created successfully!");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        toast.error(resultAction.payload || "Failed to create candidate");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-surface-subtle bg-white p-6 md:p-8 shadow-panel relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors"
        >
          <FaTimes size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-brand-50 text-brand-600"><FaUserPlus size={22} /></div>
          <h3 className="text-xl font-semibold text-ink">Create New Candidate</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Full Name *</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink placeholder-ink-faint outline-none focus:border-brand-500 text-sm"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Email Address *</label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink placeholder-ink-faint outline-none focus:border-brand-500 text-sm"
                placeholder="john.doe@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Mobile Number *</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink placeholder-ink-faint outline-none focus:border-brand-500 text-sm"
                placeholder="9876543210"
                value={form.mobileNumber}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Position / Title *</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink placeholder-ink-faint outline-none focus:border-brand-500 text-sm"
                placeholder="e.g. Full Stack Developer"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Department *</label>
              <select
                required
                className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="" disabled>Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.dep_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Expected Joining Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-surface-subtle bg-white px-4 py-3 text-ink outline-none focus:border-brand-500 text-sm"
                value={form.expectedJoiningDate}
                onChange={(e) => setForm({ ...form, expectedJoiningDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-2">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full rounded-lg border border-surface-subtle bg-white pl-4 pr-10 py-3 text-ink placeholder-ink-faint outline-none focus:border-brand-500 text-sm"
                  placeholder="Enter Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-subtle pt-6 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-surface-subtle bg-white px-6 py-3 font-semibold text-ink hover:bg-surface-muted transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent-600 hover:bg-accent-700 px-6 py-3 font-semibold text-white transition-colors text-sm disabled:opacity-50"
            >
              {loading ? "Creating candidate..." : "Create Candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCandidate;
