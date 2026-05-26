from typing import Dict, List
from uuid import UUID
from fastapi import FastAPI, Query, Depends, Path, HTTPException
from fastapi.responses import JSONResponse
from schema.validation import Item, ItemUpdate
from data.helpers import process_data, add_data, delete_data, update_data

def with_computed(values:List[Dict])-> List[Dict]:
  return [Item.model_validate(p).model_dump(mode="json") for p in values]

app = FastAPI(title="FlickVault",version="1.0")

@app.get("/")
def home():
  return JSONResponse(
    status_code=200, content="Welcome to FlickVault! Check '/docs' to get a solid idea about the API."
  )

@app.get("/search")
def search_with_queries(
  imdb_id:str = Query(
    default=None,pattern="^tt\d{7,10}$", description="IMDB ID of the media"
  ),
  name:str = Query(
    default= None, pattern="^[^\s].*[^\s]$", max_length=300,
    description="Title of the media"
  ),
  year:int = Query(
    default=None, description="Year of release", le=2050, ge= 1900
  ), 
  watched:bool = Query(
    default=None, description="`True` if already watched, otherwise `False`"
  ),
  dep = Depends(process_data)
):
  result = with_computed(dep)

  if imdb_id:
    result = [r for r in result if r["imdb_id"] == imdb_id]
  if name:
    result = [r for r in result if name.lower() in r["title"].lower()]
  if year:
    result = [r for r in result if year == r["year"]]
  if watched is not None: 
    result = [r for r in result if r["watched"] == watched]

  if not result:
    raise HTTPException(status_code=404, detail="No item found")
  else:
    content = {
      "items_found":len(result),
      "items":result
    }
    return JSONResponse(
      status_code=200, content= content
    )

@app.get("/watchlist")
def get_watchlist(
  dep = Depends(process_data)
):
  result = with_computed(dep)
  result = [r for r in result if not r["watched"]]
  content = {
    "items_found":len(result),
    "items":result
  }
  return JSONResponse(status_code=200, content=content)

@app.get("/watchedlist")
def get_watchedlist(
  dep = Depends(process_data)
):
  result = with_computed(dep)
  result = [r for r in result if r["watched"]]
  content = {
    "items_found":len(result),
    "items":result
  }
  return JSONResponse(status_code=200, content=content)

@app.get("/item_uuid/{uuid}")
def get_item_by_uuid(uuid:UUID = Path(
  default=None, description="UUID of the media"
), dep = Depends(process_data)):
  result = with_computed(dep)
  result = [r for r in result if r["uuid"] == uuid]
  return JSONResponse(status_code=200, content=result)

@app.get("/item_id/{imdb_id}")
def get_item_by_imdb_id(imdb_id:str = Path(
  default=None, description="IMDB ID of the media", examples=["tt2543164"], pattern="^tt\d{7,10}$"
), dep = Depends(process_data)):
  result = with_computed(dep)
  result = [r for r in result if r["imdb_id"] == imdb_id]
  return JSONResponse(status_code=200, content=result)

@app.post("/add_item",status_code=201)
def add_item(payload:Item):
  payload:dict = payload.model_dump(mode="json")
  dickt = add_data(payload)

  content = {"status":"Addition Successful", "added_item":dickt}
  return JSONResponse(status_code=201, content=content)

@app.delete("/delete_item/{imdb_id}")
def delete_item_by_imdb_id(imdb_id:str = Path(
  default=None, description="IMDB ID of the media", examples=["tt2543164"], pattern="^tt\d{7,10}$"
)):
  dickt = delete_data(imdb_id)
  content = {"status":"Deletion Successful", "deleted_item":dickt}
  return JSONResponse(status_code=200, content=content)

@app.put("/update_item/{imdb_id}")
def update_item_by_imdb_id(value:ItemUpdate,imdb_id:str = Path(
  default=None, description="IMDB ID of the media", examples=["tt2543164"], pattern="^tt\d{7,10}$"
),dep = Depends(process_data)):
  whole:List[Dict] = with_computed(dep)
  existing = [r for r in whole if r["imdb_id"] == imdb_id][0]
  existing1 = existing
  if not existing:
    raise HTTPException(
      status_code=404,detail=f"ID = {imdb_id} does not exist"
    ) 
  value:Dict = value.model_dump(mode="json",exclude_unset=True)

  for key_inc, val_inc in value.items():
    if isinstance(val_inc,dict) and isinstance(existing.get(key_inc),dict):
      existing[key_inc] = {**existing.get(key_inc), **val_inc}
    else:
      existing[key_inc] = val_inc
  existing = Item.model_validate(existing).model_dump(mode="json")
  update_data(existing)

  content = {
    "status":"Update Successful",
    "before_update": existing1,
    "after_update": existing
  }
  return JSONResponse(status_code=200, content=content)
