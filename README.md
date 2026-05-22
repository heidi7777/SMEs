# trea（MVP）

基于 PRD《设计密集型中小企业 AI 业务工作台（MVP）》实现的 Next.js Web 应用骨架：

- Dashboard：首页 3 张「破冰快捷指令卡」+ 最近会话
- 4 个业务工作台：创意工坊 / 视觉车间 / 沟通台 / 营销工坊
- 全局资产库：模板（含 `[变量占位符]`）管理，支持输入框 `/` 唤起与 Modal 填参后直接发起请求
- 纯前端 LocalStorage 持久化（会话/收藏/资产）
- Next.js Route Handler `/api/chat` 作为服务端代理隐藏 Key

## Getting Started

### 1) 配置环境变量

复制示例文件并填写：

```bash
cp .env.local.example .env.local
```

至少需要：

- `OPENAI_API_KEY`：你的 API Key

可选：

- `OPENAI_BASE_URL`：兼容 OpenAI 的网关地址（不填则默认 OpenAI 官方）
- `OPENAI_MODEL`：模型名（不填则默认 `gpt-4o-mini`）

### 2) 本地/云端启动

运行开发服务器：

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 3) GitHub Codespaces

仓库内已包含 `.devcontainer/devcontainer.json`，在 GitHub → Code → Codespaces 一键创建即可。

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 项目结构（关键目录）

- `src/app/`：页面路由（Dashboard、4 个房间、资产库）
- `src/app/api/chat/route.ts`：服务端代理（隐藏 Key）+ 模型响应解析
- `src/components/`：侧边栏、房间 UI、对话组件
- `src/lib/`：LocalStorage 状态、Prompt 模板等

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
