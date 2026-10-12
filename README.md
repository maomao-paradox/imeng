# 梦间

梦境记录与词网络 Web 应用，前后端分离：

- `frontend/`：React + TypeScript + Vite
- `backend/`：Python + FastAPI、异步 SQLAlchemy + Alembic，MVP 使用 SQLite

## 本地开发

分别在两个终端启动服务：

```bash
cd backend
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

前端默认运行于 `http://localhost:5173`，后端默认运行于 `http://localhost:8000`；后端 API 文档见 `http://localhost:8000/docs`。

后端认证使用 HttpOnly Cookie。部署在 HTTPS 环境时请将 `SESSION_COOKIE_SECURE=true`。关键词提炼接口支持通过 `KEYWORD_EXTRACTOR=module:Class` 加载实现 `extract(content)` 的 Python 插件；未配置供应方时会明确返回未配置状态，梦境仍可手动维护关键词。

## 检查

- 前端：在 `frontend/` 执行 `npm run lint`、`npm test` 和 `npm run build`
- 后端：在 `backend/` 执行 `uv run pytest`、`uv run ruff check .`、`uv run mypy app` 和 `uv run alembic check`