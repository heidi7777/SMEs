import type { Config } from "tailwindcss";

// Tailwind CSS v4 scans sources from CSS via `@source`.
// Keep this file only for optional theme customization to avoid scan-config conflicts.
const config: Config = {
  theme: {
    extend: {},
  },
  // 已经清理了所有的 Git 冲突标记
  plugins: [
    require('@tailwindcss/typography')
  ],
};

export default config;