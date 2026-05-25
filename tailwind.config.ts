import type { Config } from "tailwindcss";

// Tailwind CSS v4 scans sources from CSS via `@source`.
// Keep this file only for optional theme customization to avoid scan-config conflicts.
const config: Config = {
  theme: {
    extend: {},
  },
  // 修改这里：引入 typography 插件
  plugins: [
    require('@tailwindcss/typography')
  ],
};

export default config;