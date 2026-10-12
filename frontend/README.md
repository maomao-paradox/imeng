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

页面路由和响应式应用外壳已就位；业务页面当前为占位内容。API 请求统一从 `src/api/client.ts` 发起。
