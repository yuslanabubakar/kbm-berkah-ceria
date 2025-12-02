import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2E5AAC",
          coral: "#FF7B6A",
          sand: "#F4E3C1"
        }
      }
    }
  },
  plugins: []
};

export default config;
