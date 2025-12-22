import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      colors: {
        brand: "#0F2A44",
        accent: "#F97316",
        "surface-light": "#F3F4F6",
        "text-main": "#111827",
        "text-muted": "#6B7280",
        success: "#16A34A",
        warning: "#DC2626",
        info: "#2563EB"
      }
    }
  },
  plugins: []
};

export default config;
