import { createTheme } from "@mui/material/styles";

// Primary is the crimson sampled from the Grazioso Salvare logo (#C9134B),
// lightened for dark mode to keep AA contrast against the dark background.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "media" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#c9134b" },
        error: { main: "#c0392b" },
        background: { default: "#ffffff" },
        text: { primary: "#2b2b33" },
        divider: "#e2e2e6",
      },
    },
    dark: {
      palette: {
        primary: { main: "#e06287" },
        error: { main: "#c0392b" },
        background: { default: "#16171d", paper: "#16171d" },
        text: { primary: "#e5e5ea" },
        divider: "#33343d",
      },
    },
  },
  typography: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
  },
});
