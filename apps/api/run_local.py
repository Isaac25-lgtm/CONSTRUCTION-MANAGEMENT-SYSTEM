"""
Local Development Runner - This file is for local development only.
It patches PostgreSQL-specific types to work with SQLite.
Run with: python run_local.py
"""
import sys
import os

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Patch PostgreSQL types for SQLite compatibility BEFORE importing anything else
from sqlalchemy import String, TypeDecorator, JSON, event
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Engine
import uuid as uuid_module

class SQLiteUUID(TypeDecorator):
    """Platform-independent UUID type that uses String for SQLite"""
    impl = String(36)
    cache_ok = True

    def __init__(self, as_uuid=True):
        super().__init__()
        self.as_uuid = as_uuid

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid_module.UUID):
                return str(value)
            return str(uuid_module.UUID(value))
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if self.as_uuid:
                return uuid_module.UUID(value)
            return value
        return value

# Monkey-patch the PostgreSQL types
postgresql.UUID = SQLiteUUID
postgresql.JSONB = JSON
postgresql.ARRAY = lambda item_type=None, **kw: JSON

# Patch the session module to use SQLite-compatible settings
original_create_engine = None

def patch_session():
    """Patch the session module for SQLite compatibility"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker, declarative_base
    from app.core.config import settings

    database_url = settings.normalized_database_url

    # SQLite needs different engine settings
    if database_url.startswith("sqlite"):
        engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False},  # Required for SQLite with FastAPI
        )
    else:
        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

    return engine, SessionLocal, Base

# Enable foreign keys for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in str(type(dbapi_connection)).lower():
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

print("=" * 50)
print("BuildPro Local Development Server")
print("=" * 50)
print("PostgreSQL types patched for SQLite compatibility")
print()

# Now import and run the app
if __name__ == "__main__":
    # Patch session before importing models
    engine, SessionLocal, Base = patch_session()

    # Patch the session module
    import app.db.session as session_module
    session_module.engine = engine
    session_module.SessionLocal = SessionLocal
    session_module.Base = Base

    from app.core.config import settings

    print(f"Database: {settings.normalized_database_url}")
    print(f"Environment: {settings.ENVIRONMENT}")
    print()

    # Import all models so metadata is fully registered before create_all
    from app.models import *  # noqa: F401,F403

    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
    print()

    # Seed initial data
    print("Seeding default data...")
    from app.db.init_db import init_db
    init_db()

    print()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))

    print(f"Starting server at http://{host}:{port}")
    print(f"API Docs: http://{host}:{port}/docs")
    print("Frontend: http://localhost:5173")
    print()
    print("Login credentials:")
    print("  admin@example.com / Admin@123456")
    print()

    import uvicorn
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

