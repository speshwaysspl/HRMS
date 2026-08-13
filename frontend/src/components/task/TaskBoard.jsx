import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { API_BASE } from "../../utils/apiConfig";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";
import EmptyState from "../common/EmptyState";
import { FiClipboard } from "react-icons/fi";

const COLUMNS = ["Assigned", "In Progress", "Review", "Completed"];

const PRIORITY_STYLES = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-accent-100 text-accent-700",
};

const TaskCard = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 50 : "auto" }
    : undefined;

  const isTerminal = task.status === "Overdue" || task.status === "Not Completed";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-surface-subtle rounded-lg shadow-card p-3 mb-2 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <p className="text-sm font-semibold text-ink">{task.title}</p>
      <p className="text-xs text-ink-muted mt-1 line-clamp-2">{task.description}</p>
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium}`}>
          {task.priority}
        </span>
        {task.deadline && (
          <span className="text-[11px] text-ink-faint">
            {new Date(task.deadline).toLocaleDateString()}
          </span>
        )}
      </div>
      {isTerminal && (
        <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          {task.status}
        </span>
      )}
    </div>
  );
};

const Column = ({ status, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] bg-surface-muted rounded-xl p-3 border ${
        isOver ? "border-accent-400" : "border-surface-subtle"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-ink">{status}</h3>
        <span className="text-xs text-ink-faint bg-white border border-surface-subtle rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div className="min-h-[80px]">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} />
        ))}
      </div>
    </div>
  );
};

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const location = useLocation();
  const listPath = location.pathname.replace(/\/board$/, "");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/task`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (response.data.success) setTasks(response.data.tasks || []);
    } catch (err) {
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id;
    const newStatus = over.id;
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === newStatus || !COLUMNS.includes(newStatus)) return;

    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));

    try {
      const formData = new FormData();
      formData.append("status", newStatus);
      await axios.put(`${API_BASE}/api/task/${taskId}`, formData, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (err) {
      setTasks(prevTasks);
      alert("Failed to update task status");
    }
  };

  if (loading) return <LoadingState message="Loading task board…" />;
  if (error) return <ErrorState message={error} onRetry={fetchTasks} />;
  if (tasks.length === 0) {
    return <EmptyState icon={FiClipboard} title="No tasks yet" message="Assigned tasks will appear here as a board." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-semibold text-ink flex items-center gap-2">
          <FiClipboard className="text-brand-700" /> Task Board
        </h2>
        <Link
          to={listPath}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-surface-subtle bg-white text-ink hover:bg-surface-muted transition-colors"
        >
          List View
        </Link>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((status) => (
            <Column key={status} status={status} tasks={tasks.filter((t) => t.status === status)} />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default TaskBoard;
