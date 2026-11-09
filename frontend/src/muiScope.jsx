import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import muiTheme from "./muiTheme";

// MUI is only used by a few screens. Wrapping them here (instead of the whole
// app in main.jsx) keeps MUI + Emotion out of the first download.
export const withMuiTheme = (Component) => {
  const Wrapped = (props) => (
    <ThemeProvider theme={muiTheme}>
      <Component {...props} />
    </ThemeProvider>
  );
  Wrapped.displayName = `withMuiTheme(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
};
