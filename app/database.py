from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool
from typing import Generator
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Render (and some hosts) provide DATABASE_URL starting with "postgres://".
# SQLAlchemy 2.x requires the "postgresql://" scheme — normalize it.
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    _db_url,
    echo=settings.SQLALCHEMY_ECHO,
    poolclass=NullPool,
    pool_pre_ping=True,
    connect_args={
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000"
    }
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

Base = declarative_base()


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ✅ FIXED: Proper quoted extension names + individual transactions
@event.listens_for(engine, "connect")
def enable_rls(dbapi_conn, connection_record):
    """Enable necessary PostgreSQL extensions"""
    cursor = dbapi_conn.cursor()
    extensions = [
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
        'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
        'CREATE EXTENSION IF NOT EXISTS "pg_trgm"',
    ]
    for ext in extensions:
        try:
            cursor.execute(ext)
            cursor.execute("COMMIT")
        except Exception as e:
            cursor.execute("ROLLBACK")
            logger.warning(f"Could not enable extension: {e}")
    cursor.close()


class DatabaseError(Exception):
    pass


def get_session() -> Session:
    return SessionLocal()