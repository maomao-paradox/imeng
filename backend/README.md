# 梦间后端

Python 3.11+ + FastAPI 异步后端服务。MVP 默认使用异步 SQLite，数据库文件位于 `data/dream.db`；数据库连接串可通过 `DATABASE_URL` 配置。

## 开始开发

```bash
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

服务默认监听 `http://localhost:8000`，健康检查为 `GET /api/health`，交互式 API 文档为 `/docs`。本地开发跨域来源可用 `FRONTEND_ORIGIN` 配置。

## 检查

```bash
uv run pytest
uv run ruff check .
uv run mypy app
```
