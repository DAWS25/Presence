"""Database engine and session management using SQLModel."""

import os
import logging
from urllib.parse import quote_plus
import boto3
from sqlmodel import SQLModel, create_engine, Session, text

logger = logging.getLogger(__name__)

# Build connection URL from environment variables (matching compose.yaml defaults)
DB_USER = os.getenv("DB_USER") or "postgres"
DB_HOST = os.getenv("DB_HOST") or "localhost"
DB_PORT = os.getenv("DB_PORT") or "5432"
DB_NAME = os.getenv("DB_NAME") or "presence"
DB_IAM_AUTH = (os.getenv("DB_IAM_AUTH") or "false").lower() == "true"


def _get_engine():
    """Create a SQLAlchemy engine, using IAM auth token if enabled."""
    if DB_IAM_AUTH:
        region = os.getenv("AWS_REGION_NAME", os.getenv("AWS_REGION", "us-east-1"))
        rds_client = boto3.client("rds", region_name=region)
        token = rds_client.generate_db_auth_token(
            DBHostname=DB_HOST,
            Port=int(DB_PORT),
            DBUsername=DB_USER,
            Region=region,
        )
        database_url = f"postgresql://{DB_USER}:{quote_plus(token)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        return create_engine(database_url, echo=False, connect_args={"sslmode": "require"})
    else:
        db_password = os.getenv("DB_PASSWORD", "DoNotUseDefaultPasswordsPlease")
        database_url = f"postgresql://{DB_USER}:{db_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        return create_engine(database_url, echo=False)


engine = _get_engine()


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
