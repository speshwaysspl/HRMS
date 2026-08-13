import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import { FaBuilding } from "react-icons/fa";
import { columns, DepartmentButtons } from "../../utils/DepartmentHelper";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import PageHeader from "../common/PageHeader";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

const DepartmentList = () => {
  useMeta({
    title: "Departments — Speshway HRMS",
    description: "Manage and search departments.",
    keywords: "departments, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/admin-dashboard/departments`,
    robots: "noindex,nofollow"
  });
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
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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
    const q = e.target.value.toLowerCase().trim();
    const records = departments.filter((dep) =>
      (dep.dep_name || "").toLowerCase().includes(q)
    );
    setFilteredDepartments(records);
  };

  return (
    <div>
      <PageHeader
        icon={FaBuilding}
        title="Manage Departments"
        subtitle="Add, update, or delete department records"
        actions={
          <Link
            to="/admin-dashboard/add-department"
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Department
          </Link>
        }
      />

      <div className="bg-white rounded-xl shadow-card border border-surface-subtle p-4 md:p-6">
        <input
          type="text"
          placeholder="Search by Department Name"
          className="w-full sm:w-80 px-4 py-2 border border-surface-subtle rounded-lg text-sm text-ink focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none mb-4"
          onChange={filterDepartments}
        />

        {depLoading ? (
          <LoadingState message="Loading departments…" />
        ) : filteredDepartments.length === 0 ? (
          <EmptyState icon={FaBuilding} title="No departments found" />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden">
              {filteredDepartments.map((department) => (
                <div key={department._id} className="bg-white rounded-lg shadow-card p-4 mb-4 border border-surface-subtle">
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-block rounded-full bg-accent-100 text-accent-700 text-xs font-medium px-2.5 py-0.5 flex-shrink-0">
                        #{department.sno}
                      </span>
                      <h4 className="font-semibold text-ink truncate">{department.dep_name}</h4>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {department.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg overflow-hidden border border-surface-subtle">
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
      </div>
    </div>
  );
};

export default DepartmentList;
