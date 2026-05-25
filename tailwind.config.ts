import type { Config } from "tailwindcss";

// Tailwind CSS v4 scans sources from CSS via `@source`.
// Keep this file only for optional theme customization to avoid scan-config conflicts.
const config: Config = {
  theme: {
    extend: {},
  },
<<<<<<< HEAD
  // 修改这里：引入 typography 插件
  plugins: [
    require('@tailwindcss/typography')
  ],
=======
>>>>>>> dc92c638413c166d9dfac55f320454291edad8fd
};

export default config;