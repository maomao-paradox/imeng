# 梦间前端

React + TypeScript + Vite 前端项目，默认开发服务器端口为 `5173`。

## 开始开发

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_BASE_URL` 用于配置后端地址，默认开发环境地址为 `http://localhost:8000`。

## 检查

```bash
npm run lint
npm test
npm run build
```

认证、梦境记录/编辑、关键词维护、单梦词网络、列表筛选和月历已接入后端。API 请求统一从 `src/api/client.ts` 发起，并携带 HttpOnly Cookie 会话。
