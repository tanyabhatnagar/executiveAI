from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from ..config import settings

DATABASE_URL = settings.DATABASE_URL

# Default to SQLite if no database URL is provided
if not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///./promptos.db"

# Convert SQLite URL to async format
elif DATABASE_URL.startswith("sqlite:///"):
    DATABASE_URL = DATABASE_URL.replace(
        "sqlite:///",
        "sqlite+aiosqlite:///",
        1,
    )

# Convert PostgreSQL URL to asyncpg format
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+asyncpg://",
        1,
    )

    # Remove unsupported asyncpg query params from Neon URL
    DATABASE_URL = DATABASE_URL.split("?")[0]

# Database-specific connection arguments
connect_args = {}

if "sqlite" in DATABASE_URL:
    connect_args = {
        "check_same_thread": False
    }

elif "postgresql+asyncpg" in DATABASE_URL:
    connect_args = {
        "ssl": "require"
    }

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=True,
)

# Session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session