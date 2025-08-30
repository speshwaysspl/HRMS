import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";

const View = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const responnse = await axios.get(
          `${API_BASE}/api/employee/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (responnse.data.success) {
          setEmployee(responnse.data.employee);
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      }
    };

    fetchEmployee();
  }, []);
  return (
    <>
      {employee ? (
        <div className="max-w-3xl mx-auto mt-4 md:mt-10 bg-white p-4 md:p-8 rounded-md shadow-md">
          <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-center">
            Employee Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex justify-center md:justify-start">
              <img
                src={employee.userId.profileImage ? `${API_BASE}/${employee.userId.profileImage}` : `${API_BASE}/uploads/default-profile.png`}
                className="rounded-full border w-48 h-48 md:w-72 md:h-72 object-cover"
                alt="Employee Profile"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `${API_BASE}/uploads/default-profile.png`;
                }}
              />
            </div>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:space-x-3">
                <p className="text-base md:text-lg font-bold min-w-fit">Name:</p>
                <p className="font-medium break-words">{employee.userId.name}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3">
                <p className="text-base md:text-lg font-bold min-w-fit">Employee ID:</p>
                <p className="font-medium break-words">{employee.employeeId}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3">
                <p className="text-base md:text-lg font-bold min-w-fit">Email:</p>
                <p className="font-medium break-all">{employee.userId.email}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3">
                <p className="text-base md:text-lg font-bold min-w-fit">Date of Birth:</p>
                <p className="font-medium">
                  {new Date(employee.dob).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3">
                <p className="text-base md:text-lg font-bold min-w-fit">Mobile Number:</p>
                <p className="font-medium break-words">{employee.mobilenumber}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3">
                <p className="text-base md:text-lg font-bold min-w-fit">Designation:</p>
                <p className="font-medium break-words">{employee.designation}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3">
                <p className="text-base md:text-lg font-bold min-w-fit">Department:</p>
                <p className="font-medium break-words">{employee.department.dep_name}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-3 sm:items-center">
                <p className="text-base md:text-lg font-bold min-w-fit">Status:</p>
                <span className={`px-3 py-1 rounded text-white text-sm font-medium inline-block mt-1 sm:mt-0 ${
                  employee.status === 'active' 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}>
                  {employee.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div> Loading ....</div>
      )}
    </>
  );
};

export default View;
