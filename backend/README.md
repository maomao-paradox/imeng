# 梦间后端

Python 3.11+ + FastAPI 异步后端服务。MVP 默认使用异步 SQLite，数据库文件位于 `data/dream.db`；数据库连接串可通过 `DATABASE_URL` 配置。

## 开始开发

```bash
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

服务默认监听 `http://localhost:8000`，健康检查为 `GET /api/health`，交互式 API 文档为 `/docs`。本地开发跨域来源可用 `FRONTEND_ORIGIN` 配置。

认证通过随机 opaque token + 服务端会话表实现，Cookie 为 HttpOnly、SameSite=Lax；HTTPS 部署需设置 `SESSION_COOKIE_SECURE=true`。密码使用 PBKDF2-HMAC-SHA256 加盐哈希保存。

关键词提炼接口由 `KEYWORD_EXTRACTOR=module:Class` 指定适配器，类需提供 `async extract(content) -> list[tuple[str, float]]`，返回 3～8 个关键词及 0～1 权重。未配置供应方时梦境照常保存，响应会标记 `keyword_extraction_status=unconfigured`，用户可手动编辑关键词。

## 检查

```bash
uv run pytest
uv run ruff check .
uv run mypy app
uv run alembic check
```
