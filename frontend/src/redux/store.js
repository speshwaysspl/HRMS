import { configureStore } from "@reduxjs/toolkit";
import candidateReducer from "./slices/candidateSlice";
import offerReducer from "./slices/offerSlice";
import onboardingReducer from "./slices/onboardingSlice";
import hrDashboardReducer from "./slices/hrDashboardSlice";
import recruitmentReducer from "./slices/recruitmentSlice";

export const store = configureStore({
  reducer: {
    candidates: candidateReducer,
    offers: offerReducer,
    onboarding: onboardingReducer,
    hrDashboard: hrDashboardReducer,
    recruitment: recruitmentReducer
  }
});

export default store;
