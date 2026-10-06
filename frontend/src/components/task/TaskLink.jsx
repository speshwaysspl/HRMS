import React, { useEffect, useState } from "react";
import axios from "axios";
import { Navigate, useParams } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";

// Deep link from a task_submitted notification: finds the task's team and
// opens it with that task's review dialog (lead/admin), or My Tasks (assignee).
const TaskLink = ({ base }) => {
  const { taskId } = useParams();
  const [to, setTo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/task/${taskId}/locate`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      .then(({ data }) =>
        setTo(data.isLead || data.isAdmin ? `${base}/team/${data.teamId}?task=${taskId}` : "/employee-dashboard/tasks")
      )
      .catch((err) => setError(err.response?.data?.error || "Couldn't open this task."));
  }, [taskId, base]);

  if (to) return <Navigate to={to} replace />;
  return <p role={error ? "alert" : "status"} className="p-6 text-sm text-ink-muted">{error || "Opening task…"}</p>;
};

export default TaskLink;
