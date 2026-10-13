from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager
from datetime import date

import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.api import auth as auth_api
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@asynccontextmanager
async def create_test_client() -> AsyncIterator[httpx.AsyncClient]:
    auth_api._attempts.clear()
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
        assert other_network.json() == {
            "nodes": [],
            "edges": [],
            "dream_count": 0,
            "truncated": False,
        }


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


@pytest.mark.anyio
async def test_public_dreams_privacy_resonance_and_daily_matches() -> None:
    async with create_test_client() as client:
        owner = await client.post(
            "/api/auth/register",
            json={
                "email": "public-owner@example.test",
                "password": "a-long-test-password",
                "nickname": "公开昵称",
            },
        )
        assert owner.status_code == 201

        public_dreams = []
        for content, keywords, anonymous in (
            (
                "海边有一只鸟。" + "长梦境内容" * 35,
                ["海边", "飞翔"],
                True,
            ),
            ("另一场海边梦见月亮。", ["海边", "飞翔", "月亮"], False),
        ):
            created = await client.post(
                "/api/dreams",
                json={
                    "content": content,
                    "date": date.today().isoformat(),
                    "mood": ["奇妙"],
                    "is_public": True,
                    "is_anonymous": anonymous,
                },
            )
            assert created.status_code == 201
            dream_id = created.json()["id"]
            replaced = await client.put(
                f"/api/dreams/{dream_id}/keywords",
                json={
                    "keywords": [{"word": word, "weight": 0.5} for word in keywords]
                },
            )
            assert replaced.status_code == 200
            public_dreams.append(dream_id)

        private = await client.post(
            "/api/dreams",
            json={"content": "严格私密梦境", "date": date.today().isoformat()},
        )
        assert private.status_code == 201
        assert private.json()["is_public"] is False
        assert private.json()["is_anonymous"] is True

        updated_private = await client.patch(
            f"/api/dreams/{private.json()['id']}",
            json={"is_public": True, "is_anonymous": False},
        )
        assert updated_private.status_code == 200
        assert updated_private.json()["is_public"] is True
        assert updated_private.json()["is_anonymous"] is False
        own_reaction = await client.put(
            f"/api/social/dreams/{public_dreams[0]}/resonance"
        )
        assert own_reaction.status_code == 409

        hidden_private = await client.post(
            "/api/dreams",
            json={"content": "仍然私密", "date": date.today().isoformat()},
        )
        assert hidden_private.status_code == 201

        feed = await client.get("/api/social/dreams")
        assert feed.status_code == 200
        feed_body = feed.json()
        assert feed_body["total"] == 3
        assert all(
            "content" not in item and "email" not in item
            for item in feed_body["items"]
        )
        assert all("user_id" not in item for item in feed_body["items"])
        anonymous_post = next(
            item for item in feed_body["items"] if item["id"] == public_dreams[0]
        )
        assert anonymous_post["author_label"].startswith("匿名梦旅人-")
        assert len(anonymous_post["summary"]) == 160
        assert anonymous_post["is_mine"] is True
        named_post = next(
            item for item in feed_body["items"] if item["id"] == public_dreams[1]
        )
        assert named_post["author_label"] == "公开昵称"
        page = await client.get("/api/social/dreams", params={"limit": 1, "offset": 1})
        assert page.status_code == 200
        assert page.json()["total"] == 3
        assert len(page.json()["items"]) == 1
        assert page.json()["offset"] == 1
        filtered = await client.get(
            "/api/social/dreams",
            params={"q": "海边", "mood": "奇妙"},
        )
        assert filtered.status_code == 200
        assert filtered.json()["total"] == 2

        await client.post("/api/auth/logout")
        matcher = await client.post(
            "/api/auth/register",
            json={
                "email": "match-user@example.test",
                "password": "a-long-test-password",
            },
        )
        assert matcher.status_code == 201
        source = await client.post(
            "/api/dreams",
            json={
                "content": "今天梦见海边飞翔",
                "date": date.today().isoformat(),
            },
        )
        source_id = source.json()["id"]
        await client.put(
            f"/api/dreams/{source_id}/keywords",
            json={
                "keywords": [
                    {"word": "海边", "weight": 0.5},
                    {"word": "飞翔", "weight": 0.5},
                ]
            },
        )
        matches = await client.get("/api/social/matches/today")
        assert matches.status_code == 200
        match_body = matches.json()
        assert match_body["total"] == 2
        assert match_body["items"][0]["id"] == public_dreams[0]
        assert match_body["items"][0]["similarity"] == 1
        assert match_body["items"][0]["is_mine"] is False
        assert match_body["items"][0]["common_keywords"] == ["海边", "飞翔"]
        assert match_body["items"][1]["similarity"] == pytest.approx(
            2 / 3,
            abs=0.0001,
        )
        assert all(
            "content" not in item and "email" not in item
            for item in match_body["items"]
        )

        reaction = await client.put(
            f"/api/social/dreams/{public_dreams[0]}/resonance"
        )
        assert reaction.status_code == 200
        assert reaction.json() == {"reaction_count": 1, "reacted_by_me": True}
        duplicate_reaction = await client.put(
            f"/api/social/dreams/{public_dreams[0]}/resonance"
        )
        assert duplicate_reaction.json() == {"reaction_count": 1, "reacted_by_me": True}
        removed_reaction = await client.delete(
            f"/api/social/dreams/{public_dreams[0]}/resonance"
        )
        assert removed_reaction.json() == {"reaction_count": 0, "reacted_by_me": False}
        private_reaction = await client.put(
            f"/api/social/dreams/{hidden_private.json()['id']}/resonance"
        )
        assert private_reaction.status_code == 404


@pytest.mark.anyio
async def test_personal_network_caps_related_dreams_and_reports_truncation() -> None:
    async with create_test_client() as client:
        registered = await client.post(
            "/api/auth/register",
            json={
                "email": "network-size@example.test",
                "password": "a-long-test-password",
            },
        )
        assert registered.status_code == 201

        for index in range(21):
            dream = await client.post(
                "/api/dreams",
                json={
                    "content": f"第 {index} 场海边梦",
                    "date": date.today().isoformat(),
                },
            )
            assert dream.status_code == 201
            keyword_response = await client.put(
                f"/api/dreams/{dream.json()['id']}/keywords",
                json={"keywords": [{"word": "海边", "weight": 0.5}]},
            )
            assert keyword_response.status_code == 200

        network = await client.get("/api/dreams/network")
        assert network.status_code == 200
        body = network.json()
        assert body["truncated"] is True
        assert body["nodes"][0]["related_dreams_total"] == 21
        assert len(body["nodes"][0]["related_dreams"]) == 20
