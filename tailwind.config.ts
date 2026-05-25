import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  // 修改这里：引入 typography 插件
  plugins: [
    require('@tailwindcss/typography')
  ],
};

export default config;