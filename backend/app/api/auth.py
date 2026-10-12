from datetime import UTC, datetime, timedelta
from time import monotonic

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.core.config import SESSION_COOKIE_SECURE, SESSION_TTL_SECONDS
from app.models.auth_session import AuthSession
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserRead
from app.services.auth import (
    create_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: dict[str, list[float]] = {}
RATE_LIMIT = 10
RATE_WINDOW_SECONDS = 60


class LogoutResponse(BaseModel):
    status: str


def _check_rate_limit(request: Request) -> None:
    now = monotonic()
    client_host = request.client.host if request.client else "unknown"
    attempts = [
        stamp
        for stamp in _attempts.get(client_host, [])
        if now - stamp < RATE_WINDOW_SECONDS
    ]
    if len(attempts) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁，请稍后重试",
        )
    attempts.append(now)
    _attempts[client_host] = attempts


async def _issue_session(db: DbSession, user: User, response: Response) -> UserRead:
    raw_token = create_session_token()
    expires_at = datetime.now(UTC) + timedelta(seconds=SESSION_TTL_SECONDS)
    db.add(
        AuthSession(
            token_hash=hash_session_token(raw_token),
            user_id=user.id,
            expires_at=expires_at,
        )
    )
    await db.commit()
    response.set_cookie(
        key="imeng_session",
        value=raw_token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return UserRead.model_validate(user)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> UserRead:
    _check_rate_limit(request)
    email = payload.email.strip().lower()
    if email.count("@") != 1 or any(char.isspace() for char in email):
        raise HTTPException(status_code=422, detail="邮箱格式无效")
    user = User(
        email=email,
        nickname=payload.nickname.strip() or "梦旅人",
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="该邮箱已注册") from None
    return await _issue_session(db, user, response)


@router.post("/login", response_model=UserRead)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> UserRead:
    _check_rate_limit(request)
    user = await db.scalar(
        select(User).where(User.email == payload.email.strip().lower())
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return await _issue_session(db, user, response)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    db: DbSession,
    current_user: CurrentUser,
    session_token: str | None = Cookie(alias="imeng_session", default=None),
) -> LogoutResponse:
    del current_user
    if session_token:
        await db.execute(
            delete(AuthSession).where(
                AuthSession.token_hash == hash_session_token(session_token)
            )
        )
        await db.commit()
    response.delete_cookie(
        key="imeng_session",
        path="/",
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
    )
    return LogoutResponse(status="ok")


@router.get("/me", response_model=UserRead)
async def current_user(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)
