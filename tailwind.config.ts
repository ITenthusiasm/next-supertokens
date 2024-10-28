import type { Config } from "tailwindcss";

const config: Config = {
  prefix: "@",
  content: ["./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  plugins: [],
};

export default config;
