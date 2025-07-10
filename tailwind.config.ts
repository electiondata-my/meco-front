import { preset } from "@govtechmy/myds-style";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./charts/**/*.{js,ts,jsx,tsx,mdx}",
    "./dashboards/**/*.{js,ts,jsx,tsx}",
    "./data-catalogue/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "node_modules/@govtechmy/myds-react/dist/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [preset],
  theme: {
    extend: {
      colors: {
        "bg-black-950": "rgb(var(--bg-black-950))",
      },
      backgroundImage: {
        "gradient-radial":
          "radial-gradient(101.65% 92.54% at 50% 0%, var(--tw-gradient-stops))",
      },
      fontFamily: {
        poppins: ["var(--font-poppins)"],
      },
      fontSize: {
        "body-2xs": ["0.625rem", { lineHeight: "0.75rem" }],
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
            transform: "translateX(100%)",
          },
        },
      },
      animation: {
        slide: "slide 1.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
