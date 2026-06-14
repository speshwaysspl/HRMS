import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";

// Async thunks
export const fetchCandidates = createAsyncThunk(
  "recruitment/fetchCandidates",
  async (_, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/recruitment/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.candidates;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchCandidateDetails = createAsyncThunk(
  "recruitment/fetchCandidateDetails",
  async (id, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/recruitment/candidate/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createCandidate = createAsyncThunk(
  "recruitment/createCandidate",
  async (candidateData, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.post(`${API_BASE}/api/recruitment/candidate`, candidateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.candidate;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateCandidate = createAsyncThunk(
  "recruitment/updateCandidate",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.put(`${API_BASE}/api/recruitment/candidate/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.candidate;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteCandidate = createAsyncThunk(
  "recruitment/deleteCandidate",
  async (id, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/recruitment/candidate/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  "recruitment/fetchDashboardStats",
  async (_, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/recruitment/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const verifyDocument = createAsyncThunk(
  "recruitment/verifyDocument",
  async (data, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.post(`${API_BASE}/api/recruitment/verify-document`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const sendReminder = createAsyncThunk(
  "recruitment/sendReminder",
  async (candidateId, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.post(`${API_BASE}/api/recruitment/send-reminder`, { candidateId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const finalizeOfferReady = createAsyncThunk(
  "recruitment/finalizeOfferReady",
  async (candidateId, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.post(`${API_BASE}/api/recruitment/finalize-offer`, { candidateId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const initialState = {
  candidates: [],
  currentCandidate: null,
  currentCandidateProfile: null,
  currentCandidateDocuments: null,
  currentCandidateLogs: [],
  dashboardStats: null,
  loading: false,
  error: null,
  filters: {
    status: "",
    department: "",
    search: ""
  },
  darkMode: false
};

const recruitmentSlice = createSlice({
  name: "recruitment",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = { status: "", department: "", search: "" };
    },
    clearCurrentCandidate: (state) => {
      state.currentCandidate = null;
      state.currentCandidateProfile = null;
      state.currentCandidateDocuments = null;
      state.currentCandidateLogs = [];
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      if (state.darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch candidates
      .addCase(fetchCandidates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.loading = false;
        state.candidates = action.payload;
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch candidate details
      .addCase(fetchCandidateDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidateDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCandidate = action.payload.candidate;
        state.currentCandidateProfile = action.payload.profile;
        state.currentCandidateDocuments = action.payload.docs;
        state.currentCandidateLogs = action.payload.logs;
      })
      .addCase(fetchCandidateDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create candidate
      .addCase(createCandidate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCandidate.fulfilled, (state, action) => {
        state.loading = false;
        state.candidates.push(action.payload);
      })
      .addCase(createCandidate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update candidate
      .addCase(updateCandidate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCandidate.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.candidates.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.candidates[index] = action.payload;
        }
        if (state.currentCandidate?._id === action.payload._id) {
          state.currentCandidate = action.payload;
        }
      })
      .addCase(updateCandidate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete candidate
      .addCase(deleteCandidate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCandidate.fulfilled, (state, action) => {
        state.loading = false;
        state.candidates = state.candidates.filter(c => c._id !== action.payload);
      })
      .addCase(deleteCandidate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch dashboard stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Verify document
      .addCase(verifyDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCandidateDocuments = { ...state.currentCandidateDocuments, documents: action.payload.documents };
        if (state.currentCandidate) {
          state.currentCandidate.status = action.payload.status;
        }
      })
      .addCase(verifyDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setFilters, resetFilters, clearCurrentCandidate, toggleDarkMode } = recruitmentSlice.actions;
export default recruitmentSlice.reducer;
