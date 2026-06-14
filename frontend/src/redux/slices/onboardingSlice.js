import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

export const fetchCandidateProfile = createAsyncThunk(
  "onboarding/fetchCandidateProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/onboarding/profile`, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch onboarding profile");
    }
  }
);

export const updateCandidateProfile = createAsyncThunk(
  "onboarding/updateCandidateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE}/api/onboarding/profile`, profileData, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to save draft");
    }
  }
);

export const uploadOnboardingDocument = createAsyncThunk(
  "onboarding/uploadOnboardingDocument",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/onboarding/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data"
        }
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to upload document");
    }
  }
);

export const fetchCandidateDocuments = createAsyncThunk(
  "onboarding/fetchCandidateDocuments",
  async (candidateId = "", { rejectWithValue }) => {
    try {
      const url = candidateId
        ? `${API_BASE}/api/onboarding/documents/${candidateId}`
        : `${API_BASE}/api/onboarding/documents`;
      const response = await axios.get(url, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch documents");
    }
  }
);

export const verifyDocument = createAsyncThunk(
  "onboarding/verifyDocument",
  async ({ docId, status, comments }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE}/api/onboarding/documents/${docId}/verify`, { status, comments }, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to verify document");
    }
  }
);

export const convertToEmployee = createAsyncThunk(
  "onboarding/convertToEmployee",
  async (candidateId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/onboarding/convert/${candidateId}`, {}, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to convert candidate to employee");
    }
  }
);

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState: {
    candidate: null,
    offer: null,
    appointment: null,
    documents: [],
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    clearOnboardingError: (state) => {
      state.error = null;
    },
    resetOnboardingStatus: (state) => {
      state.success = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidateProfile.pending, (state) => {
        if (!state.candidate) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchCandidateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.candidate = action.payload.candidate;
        state.offer = action.payload.offer;
        state.appointment = action.payload.appointment;
        state.documents = action.payload.documents;
      })
      .addCase(fetchCandidateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateCandidateProfile.pending, (state) => {
        // Do not set loading to true here to avoid unmounting the form component during draft saves
        state.error = null;
      })
      .addCase(updateCandidateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.candidate = action.payload.candidate;
      })
      .addCase(updateCandidateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(uploadOnboardingDocument.fulfilled, (state, action) => {
        const docIndex = state.documents.findIndex(d => d.fileType === action.payload.document.fileType);
        if (docIndex > -1) {
          state.documents[docIndex] = action.payload.document;
        } else {
          state.documents.push(action.payload.document);
        }
      })
      .addCase(fetchCandidateDocuments.fulfilled, (state, action) => {
        state.documents = action.payload.documents;
      })
      .addCase(verifyDocument.fulfilled, (state, action) => {
        state.documents = state.documents.map(d =>
          d._id === action.payload.document._id ? action.payload.document : d
        );
      })
      .addCase(convertToEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(convertToEmployee.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(convertToEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearOnboardingError, resetOnboardingStatus } = onboardingSlice.actions;
export default onboardingSlice.reducer;
