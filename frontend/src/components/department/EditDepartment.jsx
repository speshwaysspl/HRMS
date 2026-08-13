import axios from "axios";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";

const EditDepartment = () => {
  const { id } = useParams();
  const [department, setDepartment] = useState({});
  const [depLoading, setDepLoading] = useState(false);
  const navigate = useNavigate();
  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/department/${id}`, [id]);
  useMeta({
    title: department?.dep_name ? `Edit ${department.dep_name} — Department` : 'Edit Department — Speshway HRMS',
    description: 'Update department details.',
    keywords: 'edit department, HRMS',
    image: '/images/Logo.jpg',
    url: canonical,
    robots: 'noindex,nofollow'
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      setDepLoading(true);
      try {
        const responnse = await axios.get(
          `${API_BASE}/api/department/${id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        if (responnse.data.success) {
          setDepartment(responnse.data.department);
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      } finally {
        setDepLoading(false);
      }
    };

    fetchDepartments();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDepartment({ ...department, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const name = department.dep_name?.trim().toLowerCase();
      if (!name) {
        alert("Department name is required");
        return;
      }
      const existing = await axios.get(`${API_BASE}/api/department`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });
      if (existing.data?.success) {
        const exists = existing.data.departments.some(
          (d) => d._id !== id && (d.dep_name || "").trim().toLowerCase() === name
        );
        if (exists) {
          alert("Department already exists");
          return;
        }
      }
      const response = await axios.put(
        `${API_BASE}/api/department/${id}`,
        department,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        navigate("/admin-dashboard/departments");
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.response.data.error);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      {depLoading ? (
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <motion.div
          className="p-6 md:p-8 w-full max-w-md rounded-xl shadow-panel bg-white border border-surface-subtle"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-center text-brand-800">
            Edit Department
          </h2>
          <form onSubmit={handleSubmit}>
            {/* Department Name */}
            <div>
              <label
                htmlFor="dep_name"
                className="text-sm font-semibold text-ink"
              >
                Department Name
              </label>
              <input
                type="text"
                name="dep_name"
                onChange={handleChange}
                value={department.dep_name || ""}
                placeholder="Department Name"
                className="mt-1 w-full p-3 border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                required
              />
            </div>

            {/* Description */}
            <div className="mt-4">
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-ink"
              >
                Description
              </label>
              <textarea
                name="description"
                placeholder="Description"
                onChange={handleChange}
                value={department.description || ""}
                className="mt-1 p-3 block w-full border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-colors"
                rows="4"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-6 bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default EditDepartment;
