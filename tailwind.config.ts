import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./charts/**/*.{js,ts,jsx,tsx,mdx}",
    "./dashboards/**/*.{js,ts,jsx,tsx}",
    "./data-catalogue/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(59.1% 166.02% at 50% -66.02%, var(--tw-gradient-stops))"
      },
      spacing: {
        4.5: "18px",
      },
      fontFamily: {
        poppins: ["var(--font-poppins)"],
      },
      colors: {
        "black": "#18181B", // Zinc 900
        "primary": "#2563EB", // Blue 600
        "primary-dark": "#3E7AFF",
        "success": "#10B981", // Emerald 500
        "danger": "#DC2626", // Red 600
        "warning": "#FBBF24", // Amber 400
        "dim": "#71717A", // Zinc 500
        "washed": "#F1F5F9", // Slate 100
        "washed-dark": "#27272A", // Zinc 800
        "outline": "#E2E8F0", // Slate 200
        "outlineHover": "#94A3B8", // Slate 400
        "outlineHover-dark": "#3F3F46", // Zinc 700
        "background": "#F8FAFC", // Slate 50
        "background-dark": "#121212",
        "purple": "#7C3AED", // Violet 600
      },
      boxShadow: {
        button: "0 1px 2px rgba(0, 0, 0, 0.1)",
        floating: "0 6px 24px rgba(0, 0, 0, 0.1)",
      },
      keyframes: {
        slide: {
          from: { width: "var(--from-width)" },
          to: { width: "var(--to-width)" },
        },
        grow: {
          from: { height: "var(--from-height)" },
          to: { height: "var(--to-height)" },
        },
        shimmer: {
          to: {
            "transform": "translateX(100%)",
          },
        },
      },
      animation: {
        slide: "slide 1.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
