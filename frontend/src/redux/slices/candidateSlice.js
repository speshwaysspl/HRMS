import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

export const fetchCandidates = createAsyncThunk(
  "candidates/fetchCandidates",
  async ({ page = 1, limit = 10, search = "", status = "", department = "" }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/candidates?page=${page}&limit=${limit}&search=${search}&status=${status}&department=${department}`,
        getHeaders()
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch candidates");
    }
  }
);

export const fetchCandidateById = createAsyncThunk(
  "candidates/fetchCandidateById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/candidates/${id}`, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch candidate details");
    }
  }
);

export const createCandidate = createAsyncThunk(
  "candidates/createCandidate",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/candidates`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data"
        }
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to create candidate");
    }
  }
);

export const updateCandidate = createAsyncThunk(
  "candidates/updateCandidate",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE}/api/candidates/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data"
        }
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to update candidate");
    }
  }
);

export const deleteCandidate = createAsyncThunk(
  "candidates/deleteCandidate",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_BASE}/api/candidates/${id}`, getHeaders());
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to delete candidate");
    }
  }
);

export const addCandidateNote = createAsyncThunk(
  "candidates/addCandidateNote",
  async ({ id, note }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/candidates/${id}/notes`, { note }, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to add note");
    }
  }
);

export const updateCandidateStatus = createAsyncThunk(
  "candidates/updateCandidateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE}/api/candidates/${id}/status`, { status }, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to update status");
    }
  }
);

export const updateCandidateAccountStatus = createAsyncThunk(
  "candidates/updateCandidateAccountStatus",
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_BASE}/api/candidates/${id}/account-status`, { isActive }, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to update account status");
    }
  }
);

const candidateSlice = createSlice({
  name: "candidates",
  initialState: {
    list: [],
    current: null,
    loading: false,
    error: null,
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      pages: 1
    }
  },
  reducers: {
    clearCandidateError: (state) => {
      state.error = null;
    },
    clearCurrentCandidate: (state) => {
      state.current = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure all candidates have isActive (default to true if missing)
        state.list = action.payload.candidates.map(c => ({
          ...c,
          isActive: c.isActive !== false
        }));
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCandidateById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidateById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = {
          ...action.payload.candidate,
          isActive: action.payload.candidate.isActive !== false
        };
      })
      .addCase(fetchCandidateById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteCandidate.fulfilled, (state, action) => {
        state.list = state.list.filter((c) => c._id !== action.payload);
      })
      .addCase(addCandidateNote.fulfilled, (state, action) => {
        if (state.current) {
          state.current.notes = action.payload.notes;
        }
      })
      .addCase(updateCandidateStatus.fulfilled, (state, action) => {
        if (state.current) {
          state.current.status = action.payload.candidate.status;
          state.current.activityTimeline = action.payload.candidate.activityTimeline;
        }
        state.list = state.list.map((c) =>
          c._id === action.payload.candidate._id ? { ...c, status: action.payload.candidate.status } : c
        );
      })
      .addCase(updateCandidateAccountStatus.fulfilled, (state, action) => {
        if (state.current) {
          state.current.isActive = action.payload.candidate.isActive;
          state.current.activityTimeline = action.payload.candidate.activityTimeline;
        }
        state.list = state.list.map((c) =>
          c._id === action.payload.candidate._id ? { ...c, isActive: action.payload.candidate.isActive } : c
        );
      });
  }
});

export const { clearCandidateError, clearCurrentCandidate } = candidateSlice.actions;
export default candidateSlice.reducer;
