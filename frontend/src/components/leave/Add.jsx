import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";

const Add = () => {
    const {user} = useAuth()

    const [leave, setLeave] = useState({
        userId: user._id,
    })

    const navigate = useNavigate()

    // Get today's date in YYYY-MM-DD format in IST
    const getTodayDate = () => {
        return toISTDateString(new Date());
    };

    // Get tomorrow's date in YYYY-MM-DD format in IST
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return toISTDateString(tomorrow);
    };

    const validateDates = (name, value) => {
        const today = getTodayDate();
        const tomorrow = getTomorrowDate();
        
        if (name === 'startDate') {
            if (value < today) {
                alert('From date should be today or a future date!');
                return false;
            }
            // If end date is already selected, validate it against new start date
            if (leave.endDate && value >= leave.endDate) {
                alert('From date should be before the To date!');
                return false;
            }
        }
        
        if (name === 'endDate') {
            if (value < tomorrow) {
                alert('To date should be tomorrow or a future date!');
                return false;
            }
            // If start date is selected, validate end date against it
            if (leave.startDate && value <= leave.startDate) {
                alert('To date should be after the From date!');
                return false;
            }
        }
        
        return true;
    };

  const handleChange = (e) => {
    const {name, value} = e.target;
    
    // Validate dates before updating state
    if ((name === 'startDate' || name === 'endDate') && value) {
        if (!validateDates(name, value)) {
            // Reset the input field to empty if validation fails
            e.target.value = '';
            return;
        }
    }
    
    setLeave((prevState) => ({...prevState, [name] : value}))
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        const response = await axios.post(
          `${API_BASE}/api/leave/add`,leave,
          {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          navigate(`/employee-dashboard/leaves/${user._id}`)
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      }
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-10 bg-white p-4 md:p-8 rounded-md shadow-md">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Request for Leave</h2>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col space-y-4 md:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Leave Type
            </label>
            <select
              name="leaveType"
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Department</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Annual Leave">Annual Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* from date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                From Date
              </label>
              <input
                type="date"
                name="startDate"
                min={getTodayDate()}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                required
              />
            </div>

            {/* to date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                To Date
              </label>
              <input
                type="date"
                name="endDate"
                min={leave.startDate ? toISTDateString(new Date(new Date(leave.startDate).getTime() + 24 * 60 * 60 * 1000)) : getTomorrowDate()}
                onChange={handleChange}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          {/* description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="reason"
              placeholder="Reason"
              onChange={handleChange}
              className="w-full border border-gray-300"
              required
            ></textarea>
          </div>
        </div>
        <button
          type="submit"
          className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Leave
        </button>
      </form>
    </div>
  );
};

export default Add;
