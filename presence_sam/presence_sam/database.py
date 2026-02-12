"""Database engine and session management using SQLModel."""

import os
import logging
from sqlmodel import SQLModel, create_engine, Session, text

logger = logging.getLogger(__name__)

# Build connection URL from environment variables (matching compose.yaml defaults)
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "DoNotUseDefaultPasswordsPlease")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "presence")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=False)


def create_db_and_tables():
    """Create all SQLModel tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session


def check_connection() -> str:
    """Test the database connection. Returns 'OK' or error message."""
    try:
        with Session(engine) as session:
            result = session.exec(text("SELECT 'O' || 'K'")).first()
            return result[0] if result else "NO RESULT"
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return str(e)
