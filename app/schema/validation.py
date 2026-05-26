from pydantic import BaseModel, AnyUrl, Field, model_validator
from typing import Annotated, Optional, List
from uuid import UUID, uuid4

class Item(BaseModel):
  uuid:UUID = Field(default_factory=lambda:uuid4())
  title:Annotated[str, Field(
    ..., description="Title of the media", 
    examples=["The Departed","Interstellar","Game Of Thrones"],
    
  )]

class Item_put(BaseModel):
  pass