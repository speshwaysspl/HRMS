import { createTheme } from "@mui/material/styles";

// Maps MUI's default blue theme to the app's navy/green design system
// (brand-* / accent-* Tailwind tokens) so MUI-based pages (Feedback, HR
// Command Center, etc.) look consistent with the rest of the portal.
const muiTheme = createTheme({
  palette: {
    primary: {
      main: "#2c3968", // brand-600
      dark: "#232c54", // brand-700
      light: "#5c6fab", // brand-400
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#337038", // accent-600
      dark: "#2a5a2f", // accent-700
      light: "#5da562", // accent-400
      contrastText: "#ffffff",
    },
    error: {
      main: "#dc2626",
    },
    warning: {
      main: "#d97706",
    },
    background: {
      default: "#f6f7fb", // surface-muted
      paper: "#ffffff",
    },
    text: {
      primary: "#1c2333", // ink
      secondary: "#5b6376", // ink-muted
    },
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

export default muiTheme;
