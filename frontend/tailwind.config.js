/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "sevillana": ["Sevillana", "sans-serif"],
        "sans": ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef1f8",
          100: "#d7ddef",
          200: "#b0bbdf",
          300: "#8898cd",
          400: "#5c6fab",
          500: "#374a85",
          600: "#2c3968",
          700: "#232c54",
          800: "#1c2344",
          900: "#161b35",
          950: "#0e1122",
        },
        accent: {
          50: "#eef7ee",
          100: "#d7ecd8",
          200: "#b0d9b3",
          300: "#84c088",
          400: "#5da562",
          500: "#3f8b45",
          600: "#337038",
          700: "#2a5a2f",
          800: "#224726",
          900: "#1b381e",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f6f7fb",
          subtle: "#eef0f6",
        },
        ink: {
          DEFAULT: "#1c2333",
          muted: "#5b6376",
          faint: "#8b93a7",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 40, 0.06), 0 1px 3px 0 rgba(16, 24, 40, 0.08)",
        panel: "0 4px 12px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
}

