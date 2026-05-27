from pydantic import BaseModel, AnyUrl, Field, model_validator, computed_field
from typing import Annotated, Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone

class Item(BaseModel):
  uuid:UUID = Field(default_factory=lambda:uuid4())
  imdb_id: Annotated[str, Field(
    ..., description="Unique IMDB ID of the media",
    examples=["tt0407887"], pattern=r"^tt\d{7,10}$"
  )]
  title:Annotated[str, Field(
    ..., description="Title of the media", 
    examples=["The Departed","Interstellar","Game Of Thrones"],
    min_length=1, max_length=300, pattern=r"^[^\s].*[^\s]$"
  )]
  year:Annotated[int,Field(
    description="Year of release",
    examples=[2006], ge=1900, le=2050
  )]
  end_year:Annotated[Optional[int], Field(
    description="Year of ending (applicable for TVs only, Optional)",
    examples=[2006], ge=1900, le=2050
  )] = None
  poster_url:Annotated[Optional[List[AnyUrl]], Field(
    description="List of poster-image links (Optional)",
    examples=["https://upload.wikimedia.org/wikipedia/en/5/50/Departed234.jpg"]
  )] = None
  watched:bool
  rating:Annotated[Optional[float], Field(
    description="Personal rating of the media (Optional)", 
    examples=[8.5],ge=0, le=10
  )] = None
  comment:Annotated[Optional[str],Field(
    description="Comment (Optional)", 
    examples=["One of the most complex plots I have ever seen in a movie."],
    max_length=1000, min_length=5
  )] = None
  date_added:datetime = Field(default_factory=lambda : datetime.now(timezone.utc))

  @computed_field
  @property
  def imdb_link(self) -> str:
    imdb_id = self.imdb_id
    return f"https://www.imdb.com/title/{imdb_id}/"

  @model_validator(mode="after")
  def watched_validator(self:"Item") -> "Item":
    if self.watched is False and (self.rating is not None or self.comment is not None):
      raise ValueError("`watched` is `false` but got `rating` or `comment`, expected `None` for both")
    else: 
      return self

class ItemUpdate(BaseModel):
  imdb_id: Annotated[Optional[str], Field(
    default=None, description="Unique IMDB ID of the media",
    examples=["tt0407887"], pattern=r"^tt\d{7,10}$"
  )]
  title: Annotated[Optional[str], Field(
    default=None, description="Title of the media",
    examples=["The Departed","Interstellar","Game Of Thrones"],
    min_length=1, max_length=300, pattern=r"^[^\s].*[^\s]$"
  )]
  year: Annotated[Optional[int], Field(
    default=None, description="Year of release",
    examples=[2006], ge=1900, le=2050
  )]
  end_year: Annotated[Optional[int], Field(
    default=None, description="Year of ending (applicable for TVs only)",
    examples=[2006], ge=1900, le=2050
  )] = None
  poster_url: Annotated[Optional[List[AnyUrl]], Field(
    default=None, description="List of poster-image links",
    examples=["https://upload.wikimedia.org/wikipedia/en/5/50/Departed234.jpg"]
  )] = None
  watched: Optional[bool] = None
  rating: Annotated[Optional[float], Field(
    default=None, description="Personal rating of the media",
    examples=[8.5], ge=0, le=10
  )] = None
  comment: Annotated[Optional[str], Field(
    default=None, description="Comment",
    examples=["One of the most complex plots I have ever seen in a movie."],
    max_length=1000, min_length=5
  )] = None

  @model_validator(mode="after")
  def watched_validator(self: "ItemUpdate") -> "ItemUpdate":
    if self.watched is False and (self.rating is not None or self.comment is not None):
      raise ValueError("`watched` is `false` but got `rating` or `comment`, expected `None` for both")
    return self


class PasswordUpdate(BaseModel):
  password: Annotated[str, Field(
    ..., description="New password for the authenticated user",
    min_length=6,
  )]
