import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";

const EditDepartment = () => {
  const { id } = useParams();
  const [department, setDepartment] = useState({});
  const [depLoading, setDepLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepartments = async () => {
      setDepLoading(true);
      try {
        const responnse = await axios.get(
          `${API_BASE}/api/department/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
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
      const response = await axios.put(
        `${API_BASE}/api/department/${id}`,
        department,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 via-teal-500 to-green-400 px-4">
      {depLoading ? (
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <motion.div
          className="p-6 md:p-8 w-full max-w-md rounded-2xl shadow-xl bg-white"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-xl md:text-2xl font-extrabold mb-4 md:mb-6 text-center text-gray-800">
            Edit Department
          </h2>
          <form onSubmit={handleSubmit}>
            {/* Department Name */}
            <div>
              <label
                htmlFor="dep_name"
                className="text-sm font-semibold text-gray-700"
              >
                Department Name
              </label>
              <motion.input
                type="text"
                name="dep_name"
                onChange={handleChange}
                value={department.dep_name || ""}
                placeholder="Department Name"
                className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                required
                whileFocus={{ scale: 1.02 }}
              />
            </div>

            {/* Description */}
            <div className="mt-4">
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700"
              >
                Description
              </label>
              <motion.textarea
                name="description"
                placeholder="Description"
                onChange={handleChange}
                value={department.description || ""}
                className="mt-1 p-3 block w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                rows="4"
                whileFocus={{ scale: 1.02 }}
              />
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Save Changes
            </motion.button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default EditDepartment;
