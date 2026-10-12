from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager

import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@asynccontextmanager
async def create_test_client() -> AsyncIterator[httpx.AsyncClient]:
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    test_sessions = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator:
        async with test_sessions() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        await test_engine.dispose()


@pytest.mark.anyio
async def test_health_and_full_private_dream_flow() -> None:
    async with create_test_client() as client:
        health = await client.get("/api/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok"}

        unauthenticated = await client.get("/api/dreams")
        assert unauthenticated.status_code == 401

        registered = await client.post(
            "/api/auth/register",
            json={
                "email": "reader@example.test",
                "password": "a-long-test-password",
                "nickname": "梦旅人",
            },
        )
        assert registered.status_code == 201
        assert "httponly" in registered.headers["set-cookie"].lower()
        assert "password_hash" not in registered.text

        today = await client.post(
            "/api/dreams",
            json={
                "content": "我梦见海边有一座很高的楼梯。",
                "date": "2026-10-12",
                "mood": ["奇妙", "平静"],
                "clarity": 4,
            },
        )
        assert today.status_code == 201
        dream = today.json()
        assert dream["keyword_extraction_status"] == "unconfigured"
        dream_id = dream["id"]

        keywords = await client.put(
            f"/api/dreams/{dream_id}/keywords",
            json={
                "keywords": [
                    {"word": "海边", "weight": 0.9},
                    {"word": "楼梯", "weight": 0.6},
                ]
            },
        )
        assert keywords.status_code == 200
        assert len(keywords.json()) == 2

        network = await client.get(f"/api/dreams/{dream_id}/network")
        assert network.status_code == 200
        assert len(network.json()["nodes"]) == 2
        assert network.json()["edges"] == [
            {
                "source": keywords.json()[0]["id"],
                "target": keywords.json()[1]["id"],
                "strength": 0.2,
            }
        ]

        for filters in (
            {"q": "海边"},
            {"mood": "奇妙"},
            {"keyword": "楼梯"},
            {"q": "海边", "mood": "奇妙", "keyword": "楼梯"},
        ):
            filtered = await client.get("/api/dreams", params=filters)
            assert filtered.status_code == 200
            assert filtered.json()["total"] == 1, filters

        calendar = await client.get(
            "/api/calendar",
            params={"year": 2026, "month": 10},
        )
        assert calendar.status_code == 200
        assert calendar.json()["recorded_days"] == 1
        assert calendar.json()["dream_count"] == 1
        assert calendar.json()["top_keywords"] == ["楼梯", "海边"]

        assert (await client.post("/api/auth/logout")).status_code == 200
        assert (await client.get("/api/auth/me")).status_code == 401
        login = await client.post(
            "/api/auth/login",
            json={
                "email": "reader@example.test",
                "password": "a-long-test-password",
            },
        )
        assert login.status_code == 200
        wrong_password = await client.post(
            "/api/auth/login",
            json={"email": "reader@example.test", "password": "incorrect"},
        )
        assert wrong_password.status_code == 401


@pytest.mark.anyio
async def test_user_cannot_read_another_users_dream() -> None:
    async with create_test_client() as client:
        first = await client.post(
            "/api/auth/register",
            json={
                "email": "first@example.test",
                "password": "a-long-test-password",
            },
        )
        assert first.status_code == 201
        first_dream = await client.post(
            "/api/dreams",
            json={
                "content": "私人的梦境记录",
                "date": "2026-10-12",
            },
        )
        dream_id = first_dream.json()["id"]
        await client.post("/api/auth/logout")

        second = await client.post(
            "/api/auth/register",
            json={
                "email": "second@example.test",
                "password": "a-long-test-password",
            },
        )
        assert second.status_code == 201
        response = await client.get(f"/api/dreams/{dream_id}")
        assert response.status_code == 404


@pytest.mark.anyio
async def test_all_dreams_network_aggregates_keywords_and_cooccurrences() -> None:
    async with create_test_client() as client:
        registered = await client.post(
            "/api/auth/register",
            json={
                "email": "network@example.test",
                "password": "a-long-test-password",
            },
        )
        assert registered.status_code == 201

        dream_ids = []
        for content in ("海边和楼梯", "海边和月亮", "另一个海边和楼梯"):
            dream = await client.post(
                "/api/dreams",
                json={"content": content, "date": "2026-10-12"},
            )
            assert dream.status_code == 201
            dream_ids.append(dream.json()["id"])

        keywords_by_dream = (
            ["海边", "楼梯"],
            ["海边", "月亮"],
            ["海边", "楼梯"],
        )
        for dream_id, words in zip(dream_ids, keywords_by_dream, strict=True):
            response = await client.put(
                f"/api/dreams/{dream_id}/keywords",
                json={
                    "keywords": [{"word": word, "weight": 0.5} for word in words]
                },
            )
            assert response.status_code == 200

        no_keyword_dream = await client.post(
            "/api/dreams",
            json={"content": "这条梦境还没有关键词", "date": "2026-10-11"},
        )
        assert no_keyword_dream.status_code == 201

        network = await client.get("/api/dreams/network")
        assert network.status_code == 200
        result = network.json()
        assert result["dream_count"] == 4
        nodes = {node["word"]: node for node in result["nodes"]}
        assert set(nodes) == {"海边", "楼梯", "月亮"}
        assert nodes["海边"]["occurrences"] == 3
        assert len(nodes["海边"]["related_dreams"]) == 3
        assert nodes["楼梯"]["occurrences"] == 2
        edges = {
            (min(edge["source"], edge["target"]), max(edge["source"], edge["target"])):
            edge["strength"]
            for edge in result["edges"]
        }
        stair_pair = tuple(sorted((nodes["海边"]["id"], nodes["楼梯"]["id"])))
        moon_pair = tuple(sorted((nodes["海边"]["id"], nodes["月亮"]["id"])))
        assert edges[stair_pair] == 1
        assert edges[moon_pair] == 0.5

        await client.post("/api/auth/logout")
        second_user = await client.post(
            "/api/auth/register",
            json={
                "email": "network-other@example.test",
                "password": "a-long-test-password",
            },
        )
        assert second_user.status_code == 201
        other_network = await client.get("/api/dreams/network")
        assert other_network.status_code == 200
        assert other_network.json() == {"nodes": [], "edges": [], "dream_count": 0}


@pytest.mark.anyio
async def test_register_rejects_duplicate_email_and_weak_password() -> None:
    async with create_test_client() as client:
        payload = {"email": "same@example.test", "password": "a-long-test-password"}
        assert (
            await client.post("/api/auth/register", json=payload)
        ).status_code == 201
        assert (
            await client.post("/api/auth/register", json=payload)
        ).status_code == 409
        weak = await client.post(
            "/api/auth/register",
            json={"email": "weak@example.test", "password": "short"},
        )
        assert weak.status_code == 422
