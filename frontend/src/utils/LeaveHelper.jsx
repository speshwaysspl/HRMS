import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./apiConfig";

export const columns = [
  {
    name: "S No",
    selector: (row) => row.sno,
    width: "70px",
  },
  {
    name: "Emp ID",
    selector: (row) => row.employeeId,
    width: "110px",
  },
  {
    name: "Name",
    selector: (row) => row.name,
    width: "120px",
  },
  {
    name: "Leave Type",
    selector: (row) => row.leaveType,
    width: "140px",
  },
  {
    name: "Department",
    selector: (row) => row.department,
    width: "150px",
  },
  {
    name: "Days",
    selector: (row) => row.days,
    width: "80px",
  },
  {
    name: "Status",
    selector: (row) => row.status,
    width: "100px",
  },
  {
    name: "Action",
    selector: (row) => row.action,
  },
];

export const LeaveButtons = ({ Id, onDelete }) => {
  const navigate = useNavigate();

  const handleView = (id) => {
    navigate(`/admin-dashboard/leaves/${id}`);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this leave?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API_BASE}/api/leave/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (onDelete) {
        onDelete(id);
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        alert(error.response.data.error);
      } else {
        alert("Failed to delete leave");
      }
    }
  };

  return (
    <div className="flex gap-2">
      <button
        className="px-4 py-1 bg-teal-500 rounded text-white hover:bg-teal-600"
        onClick={() => handleView(Id)}
      >
        View
      </button>
      <button
        className="px-4 py-1 bg-red-500 rounded text-white hover:bg-red-600"
        onClick={() => handleDelete(Id)}
      >
        Delete
      </button>
    </div>
  );
};
