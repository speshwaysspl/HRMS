import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { columns, LeaveButtons } from "../../utils/LeaveHelper";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";


//
const Table = () => {
  const [leaves, setLeaves] = useState(null);
  const [filteredLeaves, setFilteredLeaves] = useState(null);

  const fetchLeaves = async () => {
    try {
      const responnse = await axios.get(`${API_BASE}/api/leave`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (responnse.data.success) {
        let sno = 1;
        const data = await responnse.data.leaves.map((leave) => ({
          _id: leave._id,
          sno: sno++,
          employeeId: leave.employeeId.employeeId,
          name: leave.employeeId.userId.name,
          leaveType: leave.leaveType,
          department: leave.employeeId.department.dep_name,
          days:
            Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1,
          status: leave.status,
          action: <LeaveButtons Id={leave._id} />,
        }));
        setLeaves(data);
        setFilteredLeaves(data);
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.response.data.error);
      }
    }
  };
  useEffect(() => {
    fetchLeaves();
  }, []);

  const filterByInput = (e) => {
    const data = leaves.filter((leave) =>
      leave.employeeId
        .toLowerCase()
        .includes(e.target.value.toLowerCase())
    );
    setFilteredLeaves(data)
  };
  const filterByButton = (status) => {
    const data = leaves.filter((leave) =>
      leave.status
        .toLowerCase()
        .includes(status.toLowerCase())
    );
    setFilteredLeaves(data)
  };

  return (
    <>
      {filteredLeaves ? (
        <div className="p-4 md:p-6">
          <div className="text-center mb-4 md:mb-6">
            <h3 className="text-xl md:text-2xl font-bold">Manage Leaves</h3>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Search By Employee ID"
              className="w-full lg:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              onChange={filterByInput}
            />
            <div className="flex flex-wrap gap-2 justify-center">
              <button className="px-3 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-md transition-colors text-sm"
              onClick={() => filterByButton("Pending")}>
                Pending
              </button>
              <button className="px-3 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-md transition-colors text-sm"
              onClick={() => filterByButton("Approved")}>
                Approved
              </button>
              <button className="px-3 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-md transition-colors text-sm"
              onClick={() => filterByButton("Rejected")}>
                Rejected
              </button>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden mt-4">
            {filteredLeaves.map((leave, index) => (
              <div key={leave._id} className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                      #{leave.sno}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      leave.status === "Approved"
                        ? "bg-green-100 text-green-600"
                        : leave.status === "Pending"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                  <div className="text-right">
                    {leave.action}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium text-gray-600">Employee ID:</span> {leave.employeeId}</div>
                  <div><span className="font-medium text-gray-600">Name:</span> {leave.name}</div>
                  <div><span className="font-medium text-gray-600">Leave Type:</span> {leave.leaveType}</div>
                  <div><span className="font-medium text-gray-600">Days:</span> {leave.days}</div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600">Department:</span> {leave.department}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block mt-4 overflow-x-auto">
            <DataTable columns={columns} data={filteredLeaves} pagination responsive />
          </div>
        </div>
      ) : (
        <div>Loading ...</div>
      )}
    </>
  );
};

export default Table;
