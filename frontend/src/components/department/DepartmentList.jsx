import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import { columns, DepartmentButtons } from "../../utils/DepartmentHelper";
import axios from "axios";
import { motion } from "framer-motion";
import { API_BASE } from "../../utils/apiConfig";

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const [depLoading, setDepLoading] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState([]);

  const onDepartmentDelete = () => {
    fetchDepartments();
  };

  const fetchDepartments = async () => {
    setDepLoading(true);
    try {
      const responnse = await axios.get(`${API_BASE}/api/department`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (responnse.data.success) {
        let sno = 1;
        const data = responnse.data.departments.map((dep) => ({
          _id: dep._id,
          sno: sno++,
          dep_name: dep.dep_name,
          action: (
            <DepartmentButtons
              Id={dep._id}
              onDepartmentDelete={onDepartmentDelete}
            />
          ),
        }));
        setDepartments(data);
        setFilteredDepartments(data);
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.response.data.error);
      }
    } finally {
      setDepLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filterDepartments = (e) => {
    const records = departments.filter((dep) =>
      dep.dep_name.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredDepartments(records);
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center py-10"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      <motion.div
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {depLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Manage Departments
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Add, update, or delete department records
              </p>
            </div>

            {/* Search + Add */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-5">
              <input
                type="text"
                placeholder="🔍 Search by Department Name"
                className="w-full sm:w-1/2 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                onChange={filterDepartments}
              />
              <Link
                to="/admin-dashboard/add-department"
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-md shadow hover:scale-105 transition text-center"
              >
                + Add Department
              </Link>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden">
              {filteredDepartments.map((department, index) => (
                <div key={department._id} className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                        #{department.sno}
                      </span>
                      <h4 className="font-semibold text-gray-900">{department.dep_name}</h4>
                    </div>
                    <div className="flex gap-2">
                      {department.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <DataTable
                columns={columns}
                data={filteredDepartments}
                pagination
                highlightOnHover
                striped
              />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default DepartmentList;
