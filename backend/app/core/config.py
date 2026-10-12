import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./data/dream.db",
)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", str(7 * 24 * 60 * 60)))
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
KEYWORD_EXTRACTOR = os.getenv("KEYWORD_EXTRACTOR", "")

database_url = make_url(DATABASE_URL)
if database_url.get_backend_name() == "sqlite" and database_url.database not in (
    None,
    "",
    ":memory:",
):
    Path(database_url.database).expanduser().parent.mkdir(parents=True, exist_ok=True)
