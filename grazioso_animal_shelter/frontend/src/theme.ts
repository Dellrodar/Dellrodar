import { createTheme } from "@mui/material/styles";

// Palette values mirror the tokens in index.css so MUI components and the
// remaining hand-styled elements share one look during the migration.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "media" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#7a3bff" },
        error: { main: "#c0392b" },
        background: { default: "#ffffff" },
        text: { primary: "#2b2b33" },
        divider: "#e2e2e6",
      },
    },
    dark: {
      palette: {
        primary: { main: "#a67bff" },
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
