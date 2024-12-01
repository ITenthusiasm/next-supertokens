import type { Config } from "tailwindcss";

const config: Config = {
  prefix: "@",
  corePlugins: { preflight: false },
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/pages/**/*.{js,ts,jsx,tsx,mdx}"],
  plugins: [],
};

export default config;
