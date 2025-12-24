import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/apiConfig";
import { motion, AnimatePresence } from "framer-motion";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [updateData, setUpdateData] = useState({ status: "", comments: "" });

  const getSortTimestamp = (task) => {
    const candidates = [task?.createdAt, task?.startDate, task?.deadline];
    for (const val of candidates) {
      if (!val) continue;
      const t = new Date(val).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  const formatDateOrNA = (val) => {
    if (!val) return "N/A";
    const d = new Date(val);
    const t = d.getTime();
    if (isNaN(t) || t === 0) return "N/A";
    return d.toLocaleDateString();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/task`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.success) {
        const incoming = Array.isArray(response.data.tasks) ? response.data.tasks : [];
        const sorted = [...incoming].sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
        setTasks(sorted);
      } 
    } catch (error) {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("status", updateData.status);
    formData.append("comments", updateData.comments);
    if (updateData.file) {
      formData.append("file", updateData.file);
    }
    try {
      const response = await axios.put(
        `${API_BASE}/api/task/${selectedTask._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.data.success) {
        alert("Task updated successfully");
        setSelectedTask(null);
        fetchTasks();
      }
    } catch {
      alert("Failed to update task");
    }
  };

  const getFileIcon = (type) => {
    return null;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <motion.div
      className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2
        className="text-3xl font-bold mb-6 text-gray-800"
        style={{ fontFamily: "Times New Roman, serif" }}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        My Tasks
      </motion.h2>

      <motion.div
        className="bg-white rounded-xl shadow-xl overflow-x-auto border hidden sm:block"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <table className="min-w-full border-collapse">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Title</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Deadline</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <AnimatePresence>
              {tasks.map((task, index) => (
                <motion.tr
                  key={task._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedTask(task);
                    setUpdateData({ status: task.status, comments: task.comments || "" });
                  }}
                >
                  <td className="px-6 py-4 font-medium text-gray-800">{task.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {task.startDate ? new Date(task.startDate).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDateOrNA(task.deadline)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {task.status}
                    </span>
                  </td>
                  
                </motion.tr>
              ))}
            </AnimatePresence>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-8 text-gray-500">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      <div className="sm:hidden space-y-3">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="bg-white rounded-xl shadow border p-4 cursor-pointer"
            onClick={() => {
              setSelectedTask(task);
              setUpdateData({ status: task.status, comments: task.comments || "" });
            }}
          >
            <div className="flex justify-between items-start">
              <div className="font-semibold text-gray-800">{task.title}</div>
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {task.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
              <div>Start: {task.startDate ? new Date(task.startDate).toLocaleDateString() : "N/A"}</div>
              <div>Due: {formatDateOrNA(task.deadline)}</div>
            </div>
            {task.description && (
              <div className="mt-2 text-gray-500">{task.description}</div>
            )}
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">No tasks found.</div>
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">{selectedTask.title}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-lg mb-3 text-gray-700">Task Details</h4>
                  <div className="text-sm space-y-2">
                    <p><span className="font-medium text-gray-600">Description:</span> {selectedTask.description}</p>
                    <p><span className="font-medium text-gray-600">Priority:</span> {selectedTask.priority}</p>
                    <p><span className="font-medium text-gray-600">Start Date:</span> {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : "N/A"}</p>
                    <p><span className="font-medium text-gray-600">Deadline:</span> {formatDateOrNA(selectedTask.deadline)}</p>
                    <p><span className="font-medium text-gray-600">Assigned By:</span> {selectedTask.assignedBy?.name || "Team Lead"}</p>
                    {selectedTask.workProof && (
                      <p>
                        <span className="font-medium text-gray-700">Work Proof:</span>{" "}
                        <a
                          href={`${API_BASE}/${selectedTask.workProof}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          View Attached File
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-lg mb-3 text-gray-700">Current Status</h4>
                  <div className="text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {selectedTask.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-bold text-lg mb-4 text-gray-800">Update Task</h4>
                <form onSubmit={handleUpdate} className="space-y-4">
                  {user.role !== "employee" && (
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700">Status</label>
                      <select
                        value={updateData.status}
                        onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                        className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">Attach File (Work Proof)</label>
                    <input
                      type="file"
                      className="w-full border p-2 rounded-lg"
                      onChange={(e) => setUpdateData({ ...updateData, file: e.target.files[0] })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">Comments</label>
                    <textarea
                      value={updateData.comments}
                      onChange={(e) => setUpdateData({ ...updateData, comments: e.target.value })}
                      className="w-full border p-2 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTask(null)}
                      className="px-4 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                    >
                      Update Task
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskList;
