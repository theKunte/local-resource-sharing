/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // WildPeer outdoor theme
        forest: {
          50: "#f4f7f5",
          100: "#e9eeea",
          200: "#d3ddd5",
          300: "#9db5a3",
          400: "#678d71",
          500: "#2D6A4F", // pine
          600: "#265840",
          700: "#1F4630",
          800: "#1A2E1E", // forest dark
          900: "#0F1913", // deep
        },
        pine: {
          50: "#f4f9f6",
          100: "#e8f3ed",
          200: "#d1e7db",
          300: "#a3cfb7",
          400: "#7EC8A0", // topo
          500: "#2D6A4F", // pine base
          600: "#265840",
          700: "#1F4630",
          800: "#183420",
          900: "#0F1913",
        },
        topo: {
          50: "#f3fbf7",
          100: "#e7f7ef",
          200: "#cfeede",
          300: "#9fdebe",
          400: "#7EC8A0", // topo
          500: "#5eb882",
          600: "#469368",
          700: "#367550",
          800: "#2D6A4F",
          900: "#1A2E1E",
        },
        cream: {
          50: "#FDFBF7", // snow
          100: "#F4EFE6", // cream
          200: "#EBE2D5",
          300: "#DFD2C0",
          400: "#D2C2AB",
          500: "#C5B296",
          600: "#B8A281",
          700: "#8B7D66",
          800: "#5E584B",
          900: "#312D25",
        },
        stone: {
          50: "#f7f8f8",
          100: "#eef0ef",
          200: "#dde0df",
          300: "#bbc1bf",
          400: "#99a29f",
          500: "#8B9A94", // stone
          600: "#6f7b76",
          700: "#535c58",
          800: "#373d3a",
          900: "#1b1e1d",
        },
        clay: {
          50: "#fdf8f3",
          100: "#fbf1e7",
          200: "#f7e3cf",
          300: "#efc79f",
          400: "#D4A574", // clay
          500: "#c99860",
          600: "#a77e4f",
          700: "#85643f",
          800: "#634a2f",
          900: "#413020",
        },
        ember: {
          50: "#fef5f3",
          100: "#fce9e5",
          200: "#f9d3cb",
          300: "#f3ad9d",
          400: "#E07A5F", // ember
          500: "#d66449",
          600: "#b04e39",
          700: "#8a3e2d",
          800: "#642e21",
          900: "#3e1e15",
        },
        // Keep some semantic colors for consistency
        primary: {
          50: "#f4f9f6",
          100: "#e8f3ed",
          200: "#d1e7db",
          300: "#a3cfb7",
          400: "#7EC8A0",
          500: "#2D6A4F",
          600: "#265840",
          700: "#1F4630",
          800: "#1A2E1E",
          900: "#0F1913",
        },
        success: {
          50: "#f4f9f6",
          100: "#e8f3ed",
          200: "#d1e7db",
          500: "#2D6A4F",
          600: "#265840",
          700: "#1F4630",
        },
        warning: {
          50: "#fdf8f3",
          100: "#fbf1e7",
          200: "#f7e3cf",
          500: "#D4A574",
          600: "#c99860",
          700: "#a77e4f",
        },
        danger: {
          50: "#fef5f3",
          100: "#fce9e5",
          200: "#f9d3cb",
          500: "#E07A5F",
          600: "#d66449",
          700: "#b04e39",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
