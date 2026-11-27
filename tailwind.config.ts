import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Electric indigo-blue is the main brand color
        primary: {
          DEFAULT: "#4f6bff",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1a1730",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#0d0b1a",
          foreground: "#FFFFFF",
        },
        // Role colors + accents; keep in sync with src/lib/roleColors.ts
        neon: {
          civilian: "#39ff9f",
          undercover: "#f4f7ff",
          mrwhite: "#ff3366",
          indigo: "#4f6bff",
          cyan: "#22e5ff",
          amber: "#ffc53d",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      // Soft, rounded UI font everywhere: Calibri on Windows, its metric twin Carlito elsewhere,
      // then the system font
      fontFamily: {
        sans: ["Calibri", "Carlito", "Segoe UI", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Calibri", "Carlito", "Segoe UI", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "card-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Cards scale up into place
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        // Neon sign switching on
        flicker: {
          "0%, 18%, 22%, 25%, 53%, 57%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.35" },
        },
        // Pulsing ring around the current speaker
        "ring-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(34, 229, 255, 0.55)" },
          "70%": { boxShadow: "0 0 0 8px rgba(34, 229, 255, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34, 229, 255, 0)" },
        },
        // Urgent timer
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-3px)" },
          "40%, 80%": { transform: "translateX(3px)" },
        },
        // Slow breathing glow for primary actions
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 14px rgba(79, 107, 255, 0.4)" },
          "50%": { boxShadow: "0 0 28px rgba(59, 130, 246, 0.7)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "card-flip": "card-flip 0.6s ease-in-out",
        "fade-in": "fade-in 0.4s ease-out",
        "pop-in": "pop-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
        flicker: "flicker 1.6s linear 1",
        "ring-pulse": "ring-pulse 1.6s ease-out infinite",
        shake: "shake 0.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;