from app.config import get_env
from sqlalchemy import (
  Boolean,
  Column,
  DateTime,
  Float,
  Integer,
  JSON,
  MetaData,
  String,
  Table,
  UniqueConstraint,
  create_engine,
)
from sqlalchemy.engine import Engine


def _database_url() -> str:
  url = get_env("DATABASE_URL", default="sqlite:///./flickvault.db")
  if url.startswith("postgres://"):
    return url.replace("postgres://", "postgresql+psycopg://", 1)
  if url.startswith("postgresql://"):
    return url.replace("postgresql://", "postgresql+psycopg://", 1)
  return url


engine: Engine = create_engine(_database_url(), pool_pre_ping=True)
metadata = MetaData()

media_items = Table(
  "media_items",
  metadata,
  Column("uuid", String(36), primary_key=True),
  Column("user_id", String(128), nullable=False, index=True),
  Column("imdb_id", String(16), nullable=False, index=True),
  Column("title", String(300), nullable=False),
  Column("year", Integer, nullable=False),
  Column("end_year", Integer),
  Column("poster_url", JSON),
  Column("watched", Boolean, nullable=False),
  Column("rating", Float),
  Column("comment", String(1000)),
  Column("date_added", DateTime(timezone=True), nullable=False),
  UniqueConstraint("user_id", "imdb_id", name="uq_media_items_user_imdb_id"),
)


def init_database() -> None:
  metadata.create_all(engine)
