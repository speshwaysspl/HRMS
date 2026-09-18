import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEdit2, FiDollarSign, FiCalendar, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import ActionIconButton from "../components/common/ActionIconButton";
import { API_BASE } from "./apiConfig";

const toggleEmployeeStatus = async (row) => {
  const newStatus = row.status === "active" ? "inactive" : "active";
  try {
    const response = await axios.patch(
      `${API_BASE}/api/employee/${row._id}/status`,
      { status: newStatus },
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.success && row.onStatusChange) {
      row.onStatusChange(row._id, newStatus);
    }
  } catch (error) {
    alert("Error updating status: " + (error.response?.data?.error || error.message));
  }
};

export const columns = [
  {
    name: "S No",
    selector: (row) => row.sno,
    width: "70px",
  },
  {
    name: "Employee ID",
    selector: (row) => row.employeeId,
    width: "130px",
  },
  {
    name: "Name",
    selector: (row) => row.name,
    minWidth: "160px",
    wrap: true,
    cell: (row) => (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleEmployeeStatus(row)}
          className={`w-2 h-2 rounded-full flex-shrink-0 cursor-pointer ${row.status === "active" ? "bg-accent-500" : "bg-red-500"}`}
          title={`${row.status === "active" ? "Active" : "Inactive"} — click to ${row.status === "active" ? "deactivate" : "activate"}`}
        />
        <span>{row.name}</span>
      </span>
    ),
  },
  {
    name: "Department",
    selector: (row) => row.dep_name,
    minWidth: "130px",
    wrap: true,
  },
  {
    name: "Designation",
    selector: (row) => row.designation,
    minWidth: "190px",
    wrap: true,
  },
  {
    name: "Joining Date",
    selector: (row) => row.joiningDate,
    minWidth: "190px",
    wrap: true,
  },
  {
    name: "Action",
    selector: (row) => row.action,
    center: true,
    width: "210px",
    allowOverflow: true,
  },
];

export const fetchDepartments = async () => {
  let departments;
  try {
    const responnse = await axios.get(`${API_BASE}/api/department`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (responnse.data.success) {
      departments = responnse.data.departments;
    }
  } catch (error) {
    if (error.response && !error.response.data.success) {
      alert(error.response.data.error);
    }
  }
  return departments;
};

// employees for salary form
export const getEmployees = async (id) => {
  let employees;
  try {
    const responnse = await axios.get(
      `${API_BASE}/api/employee/department/${id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (responnse.data.success) {
      employees = responnse.data.employees;
    }
  } catch (error) {
    if (error.response && !error.response.data.success) {
      alert(error.response.data.error);
    }
  }
  return employees;
};





export const EmployeeButtons = ({ Id, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center gap-1 flex-nowrap">
      <ActionIconButton icon={FiEye} label="View" color="brand" onClick={() => navigate(`/admin-dashboard/employees/${Id}`)} />
      <ActionIconButton icon={FiEdit2} label="Edit" color="brand" onClick={() => navigate(`/admin-dashboard/employees/edit/${Id}`)} />
      <ActionIconButton icon={FiDollarSign} label="Salary" color="accent" onClick={() => navigate(`/admin-dashboard/employees/salary/${Id}`)} />
      <ActionIconButton icon={FiCalendar} label="Leave" color="accent" onClick={() => navigate(`/admin-dashboard/employees/leaves/${Id}`)} />
      <ActionIconButton icon={FiTrash2} label="Delete" color="danger" onClick={() => onDelete(Id)} />
    </div>
  );
};
