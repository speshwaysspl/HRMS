import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

export const fetchOffers = createAsyncThunk(
  "offers/fetchOffers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/offers`, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch offers");
    }
  }
);

export const fetchOfferByCandidateId = createAsyncThunk(
  "offers/fetchOfferByCandidateId",
  async (candidateId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/offers/candidate/${candidateId}`, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch offer");
    }
  }
);

export const createOffer = createAsyncThunk(
  "offers/createOffer",
  async (offerData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/offers`, offerData, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to generate offer letter");
    }
  }
);

export const sendOffer = createAsyncThunk(
  "offers/sendOffer",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/offers/${id}/send`, {}, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to send offer letter");
    }
  }
);

export const revokeOffer = createAsyncThunk(
  "offers/revokeOffer",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/offers/${id}/revoke`, {}, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to revoke offer letter");
    }
  }
);

export const acceptOffer = createAsyncThunk(
  "offers/acceptOffer",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/offers/${id}/accept`, {}, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to accept offer");
    }
  }
);

export const rejectOffer = createAsyncThunk(
  "offers/rejectOffer",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/api/offers/${id}/reject`, { reason }, getHeaders());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Failed to reject offer");
    }
  }
);

const offerSlice = createSlice({
  name: "offers",
  initialState: {
    list: [],
    current: null,
    loading: false,
    error: null
  },
  reducers: {
    clearOfferError: (state) => {
      state.error = null;
    },
    clearCurrentOffer: (state) => {
      state.current = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOffers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.offers;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchOfferByCandidateId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOfferByCandidateId.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.offer;
      })
      .addCase(fetchOfferByCandidateId.rejected, (state, action) => {
        state.loading = false;
        state.current = null;
        state.error = action.payload;
      })
      .addCase(createOffer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOffer.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.offer;
        state.list = state.list.map((o) => o._id === action.payload.offer._id ? action.payload.offer : o);
      })
      .addCase(createOffer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(sendOffer.fulfilled, (state, action) => {
        if (state.current && state.current._id === action.payload.offer._id) {
          state.current.status = "Sent";
        }
        state.list = state.list.map((o) => o._id === action.payload.offer._id ? { ...o, status: "Sent" } : o);
      })
      .addCase(revokeOffer.fulfilled, (state, action) => {
        if (state.current && state.current._id === action.payload.offer._id) {
          state.current.status = "Revoked";
        }
        state.list = state.list.map((o) => o._id === action.payload.offer._id ? { ...o, status: "Revoked" } : o);
      })
      .addCase(acceptOffer.fulfilled, (state, action) => {
        if (state.current && state.current._id === action.payload.offer._id) {
          state.current.status = "Accepted";
        }
      })
      .addCase(rejectOffer.fulfilled, (state, action) => {
        if (state.current && state.current._id === action.payload.offer._id) {
          state.current.status = "Rejected";
        }
      });
  }
});

export const { clearOfferError, clearCurrentOffer } = offerSlice.actions;
export default offerSlice.reducer;
