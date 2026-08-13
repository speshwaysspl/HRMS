import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import ActionIconButton from "../components/common/ActionIconButton";
import { API_BASE } from "./apiConfig";

export const columns = [
  {
    name: "S No",
    selector: (row) => row.sno,
  },
  {
    name: "Department Name",
    selector: (row) => row.dep_name,
    sortable: false
  },
  {
    name: "Action",
    selector: (row) => row.action,
  },
];

export const DepartmentButtons = ({ Id, onDepartmentDelete }) => {
  const navigate = useNavigate();

  const handleDelete = async (id) => {
    const confirm = window.confirm("Do you want to delte?");
    if (confirm) {
      try {
        const responnse = await axios.delete(
          `${API_BASE}/api/department/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (responnse.data.success) {
          onDepartmentDelete();
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      }
    }
  };
  return (
    <div className="flex items-center gap-1">
      <ActionIconButton icon={FiEdit2} label="Edit" color="brand" onClick={() => navigate(`/admin-dashboard/department/${Id}`)} />
      <ActionIconButton icon={FiTrash2} label="Delete" color="danger" onClick={() => handleDelete(Id)} />
    </div>
  );
};
