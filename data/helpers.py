from datetime import datetime, timezone
from typing import Dict, List

from fastapi import HTTPException
from sqlalchemy import and_, insert, select, update

from data.database import engine, media_items


def _row_to_dict(row) -> Dict:
  value = dict(row._mapping)
  if isinstance(value.get("date_added"), datetime):
    date_added = value["date_added"]
    if date_added.tzinfo is None:
      date_added = date_added.replace(tzinfo=timezone.utc)
    value["date_added"] = date_added.astimezone(timezone.utc).isoformat()
  value.pop("user_id", None)
  return value


def process_data(user_id: str) -> List[Dict]:
  query = (
    select(media_items)
    .where(media_items.c.user_id == user_id)
    .order_by(media_items.c.date_added.desc())
  )
  with engine.begin() as connection:
    return [_row_to_dict(row) for row in connection.execute(query)]


def add_data(value: Dict, user_id: str) -> Dict:
  if _item_exists(user_id, value["imdb_id"]):
    raise HTTPException(
      status_code=422,
      detail=f"ID = {value['imdb_id']} already exists",
    )

  row = _storage_row(value, user_id)
  with engine.begin() as connection:
    connection.execute(insert(media_items).values(**row))
  return value


def delete_data(imdb_id: str, user_id: str) -> Dict:
  existing = _get_item(user_id, imdb_id)
  if not existing:
    raise HTTPException(
      status_code=404,
      detail=f"ID = {imdb_id} does not exist",
    )

  query = media_items.delete().where(
    and_(
      media_items.c.user_id == user_id,
      media_items.c.imdb_id == imdb_id,
    )
  )
  with engine.begin() as connection:
    connection.execute(query)
  return existing


def update_data(imdb_id: str, value: Dict, user_id: str) -> None:
  existing = _get_item(user_id, imdb_id)
  if not existing:
    raise HTTPException(
      status_code=404,
      detail=f"ID = {imdb_id} does not exist",
    )

  new_imdb_id = value["imdb_id"]
  if new_imdb_id != imdb_id and _item_exists(user_id, new_imdb_id):
    raise HTTPException(
      status_code=422,
      detail=f"ID = {new_imdb_id} already exists",
    )

  row = _storage_row(value, user_id)
  query = (
    update(media_items)
    .where(
      and_(
        media_items.c.user_id == user_id,
        media_items.c.imdb_id == imdb_id,
      )
    )
    .values(**row)
  )
  with engine.begin() as connection:
    connection.execute(query)


def _get_item(user_id: str, imdb_id: str) -> Dict | None:
  query = select(media_items).where(
    and_(
      media_items.c.user_id == user_id,
      media_items.c.imdb_id == imdb_id,
    )
  )
  with engine.begin() as connection:
    row = connection.execute(query).first()
  return _row_to_dict(row) if row else None


def _item_exists(user_id: str, imdb_id: str) -> bool:
  return _get_item(user_id, imdb_id) is not None


def _storage_row(value: Dict, user_id: str) -> Dict:
  row = {
    "uuid": str(value["uuid"]),
    "user_id": user_id,
    "imdb_id": value["imdb_id"],
    "title": value["title"],
    "year": value["year"],
    "end_year": value.get("end_year"),
    "poster_url": value.get("poster_url"),
    "watched": value["watched"],
    "rating": value.get("rating"),
    "comment": value.get("comment"),
    "date_added": value["date_added"],
  }
  if isinstance(row["date_added"], str):
    row["date_added"] = datetime.fromisoformat(row["date_added"].replace("Z", "+00:00"))
  return row
