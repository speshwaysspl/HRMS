import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiEye, FiTrash2 } from "react-icons/fi";
import ActionIconButton from "../components/common/ActionIconButton";
import { API_BASE } from "./apiConfig";

const STATUS_PILL = {
  Approved: "bg-accent-100 text-accent-700",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-700",
};

// Narrow columns are fixed; text columns grow to fill the table width (names
// get the most room and wrap instead of being cut off).
export const columns = [
  {
    name: "S No",
    selector: (row) => row.sno,
    width: "72px",
  },
  {
    name: "Emp ID",
    selector: (row) => row.employeeId,
    minWidth: "90px",
    grow: 0.8,
  },
  {
    name: "Name",
    selector: (row) => row.name,
    cell: (row) => <span className="py-2 leading-snug">{row.name}</span>,
    wrap: true,
    minWidth: "160px",
    grow: 2,
  },
  {
    name: "Leave Type",
    selector: (row) => row.leaveType,
    wrap: true,
    minWidth: "130px",
    grow: 1.3,
  },
  {
    name: "Department",
    selector: (row) => row.department,
    wrap: true,
    minWidth: "120px",
    grow: 1.2,
  },
  {
    name: "Days",
    selector: (row) => row.days,
    width: "80px",
    center: true,
    style: { fontVariantNumeric: "tabular-nums" },
  },
  {
    name: "Status",
    selector: (row) => row.status,
    cell: (row) => (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[row.status] || "bg-surface-muted text-ink-muted"}`}>
        {row.status}
      </span>
    ),
    minWidth: "110px",
    grow: 0.8,
  },
  {
    name: "Action",
    selector: (row) => row.action,
    cell: (row) => row.action,
    width: "110px",
    right: true,
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
    <div className="flex items-center gap-1">
      <ActionIconButton icon={FiEye} label="View" color="brand" onClick={() => handleView(Id)} />
      <ActionIconButton icon={FiTrash2} label="Delete" color="danger" onClick={() => handleDelete(Id)} />
    </div>
  );
};
