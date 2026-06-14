import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

export const fetchHRDashboardSummary = createAsyncThunk(
  "hrDashboard/fetchHRDashboardSummary",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/hr-dashboard/summary`, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch dashboard metrics");
    }
  }
);

const hrDashboardSlice = createSlice({
  name: "hrDashboard",
  initialState: {
    kpis: null,
    recruitment: null,
    pendingActions: null,
    joiningTracker: null,
    attendance: null,
    leaves: null,
    payroll: null,
    calendarEvents: [],
    loading: false,
    error: null
  },
  reducers: {
    clearHRDashboardError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHRDashboardSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHRDashboardSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.kpis = action.payload.kpis;
        state.recruitment = action.payload.recruitment;
        state.pendingActions = action.payload.pendingActions;
        state.joiningTracker = action.payload.joiningTracker;
        state.attendance = action.payload.attendance;
        state.leaves = action.payload.leaves;
        state.payroll = action.payload.payroll;
        state.calendarEvents = action.payload.calendarEvents;
      })
      .addCase(fetchHRDashboardSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearHRDashboardError } = hrDashboardSlice.actions;
export default hrDashboardSlice.reducer;
