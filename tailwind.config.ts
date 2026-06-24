import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#081225",
        court: "#ff4d14",
        "court-dark": "#061333",
        "paper": "#f8fafc",
      },
      boxShadow: {
        card: "0 12px 30px rgba(8, 18, 37, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
