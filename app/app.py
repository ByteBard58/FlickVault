import copy
import json
import logging
from pathlib import Path
from typing import Dict, List
from uuid import UUID

from fastapi import FastAPI, Query, Depends, Path as FastAPIPath, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import (
  get_current_user,
  get_current_user_token,
  public_auth_config,
  change_user_password,
  delete_user_account,
)
from app.config import get_env
from app.schema.validation import Item, ItemUpdate, PasswordUpdate
from data.database import init_database
from data.helpers import (
  process_data,
  add_data,
  delete_data,
  delete_all_user_data,
  update_data,
)

logger = logging.getLogger(__name__)

def with_computed(values:List[Dict])-> List[Dict]:
  return [Item.model_validate(p).model_dump(mode="json") for p in values]

app = FastAPI(title="FlickVault",version="1.0")

# CORS is intentionally restricted. The backend should only respond to approved origins.
allowed_origins = []
allowed_origins_raw = get_env("CORS_ALLOWED_ORIGINS")
if allowed_origins_raw:
  allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
  CORSMiddleware,
  allow_origins=allowed_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
  logger.exception("Unhandled error while serving %s", request.url.path)
  return JSONResponse(
    status_code=500,
    content={"detail": "Internal server error"},
  )


@app.on_event("startup")
def startup():
  init_database()

@app.get("/")
def home():
  return FileResponse("static/index.html")

@app.get("/app-config.js")
def app_config_js():
  js = (
    "window.APP_CONFIG = {\n"
    f"  supabase_url: {json.dumps(get_env('SUPABASE_URL') or '')},\n"
    f"  supabase_anon_key: {json.dumps(get_env('SUPABASE_ANON_KEY', 'SUPABASE_KEY') or '')},\n"
    "};"
  )
  return PlainTextResponse(content=js, media_type="application/javascript")

@app.get("/config")
def get_config():
  return public_auth_config()

@app.get("/search")
def search_with_queries(
  imdb_id:str = Query(
    default=None,pattern=r"^tt\d{7,10}$", description="IMDB ID of the media"
  ),
  name:str = Query(
    default= None, pattern=r"^[^\s].*[^\s]$", max_length=300,
    description="Title of the media"
  ),
  year:int = Query(
    default=None, description="Year of release", le=2050, ge= 1900
  ), 
  watched:bool = Query(
    default=None, description="`True` if already watched, otherwise `False`"
  ),
  user_id: str = Depends(get_current_user)
):
  result = with_computed(process_data(user_id))

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
  user_id: str = Depends(get_current_user)
):
  result = with_computed(process_data(user_id))
  result = [r for r in result if not r["watched"]]
  content = {
    "items_found":len(result),
    "items":result
  }
  return JSONResponse(status_code=200, content=content)

@app.get("/watchedlist")
def get_watchedlist(
  user_id: str = Depends(get_current_user)
):
  result = with_computed(process_data(user_id))
  result = [r for r in result if r["watched"]]
  content = {
    "items_found":len(result),
    "items":result
  }
  return JSONResponse(status_code=200, content=content)

@app.get("/item_uuid/{uuid}")
def get_item_by_uuid(uuid:UUID = FastAPIPath(
  description="UUID of the media"
), user_id: str = Depends(get_current_user)):
  
  result = with_computed(process_data(user_id))
  result = [r for r in result if r["uuid"] == str(uuid)]
  if not result:
    raise HTTPException(status_code=404,detail=f"No item found with UUID = {uuid} ")
  return JSONResponse(status_code=200, content=result)

@app.get("/item_id/{imdb_id}")
def get_item_by_imdb_id(imdb_id:str = FastAPIPath(
  description="IMDB ID of the media", examples=["tt2543164"], pattern=r"^tt\d{7,10}$"
), user_id: str = Depends(get_current_user)):
  result = with_computed(process_data(user_id))
  result = [r for r in result if r["imdb_id"] == imdb_id]
  if not result:
    raise HTTPException(status_code=404,detail=f"No item found with IMDB ID = {imdb_id} ")
  return JSONResponse(status_code=200, content=result)

@app.post("/add_item",status_code=201)
def add_item(payload:Item, user_id: str = Depends(get_current_user)):
  payload:dict = payload.model_dump(mode="json")
  dickt = add_data(payload, user_id)

  content = {"status":"Addition Successful", "added_item":dickt}
  return JSONResponse(status_code=201, content=content)

@app.delete("/delete_item/{imdb_id}")
def delete_item_by_imdb_id(imdb_id:str = FastAPIPath(
  description="IMDB ID of the media", examples=["tt2543164"], pattern=r"^tt\d{7,10}$"
), user_id: str = Depends(get_current_user)):
  dickt = delete_data(imdb_id, user_id)
  content = {"status":"Deletion Successful", "deleted_item":dickt}
  return JSONResponse(status_code=200, content=content)

@app.put("/update_item/{imdb_id}")
def update_item_by_imdb_id(value:ItemUpdate,imdb_id:str = FastAPIPath(
  description="IMDB ID of the media", examples=["tt2543164"], pattern=r"^tt\d{7,10}$"
), user_id: str = Depends(get_current_user)):
  whole:List[Dict] = with_computed(process_data(user_id))
  existing_list = [r for r in whole if r["imdb_id"] == imdb_id]
  if not existing_list:
    raise HTTPException(
      status_code=404,detail=f"ID = {imdb_id} does not exist"
    ) 
  existing = existing_list[0]
  existing1 = copy.deepcopy(existing)
  value:Dict = value.model_dump(mode="json",exclude_unset=True)

  for key_inc, val_inc in value.items():
    if isinstance(val_inc,dict) and isinstance(existing.get(key_inc),dict):
      existing[key_inc] = {**existing.get(key_inc), **val_inc}
    else:
      existing[key_inc] = val_inc
  existing = Item.model_validate(existing).model_dump(mode="json")
  update_data(imdb_id, existing, user_id)

  content = {
    "status":"Update Successful",
    "before_update": existing1,
    "after_update": existing
  }
  return JSONResponse(status_code=200, content=content)


@app.patch("/account/password")
def change_password(
  payload: PasswordUpdate,
  token: str = Depends(get_current_user_token),
):
  change_user_password(token, payload.password)
  return JSONResponse(
    status_code=200,
    content={"status": "Password updated successfully"},
  )


@app.delete("/account")
def delete_account(
   token: str = Depends(get_current_user_token),
   user_id: str = Depends(get_current_user),
):
   delete_user_account(user_id)
   removed = delete_all_user_data(user_id)
   return JSONResponse(
     status_code=200,
     content={
       "status": "Account deleted successfully",
       "removed_items": removed,
     },
   )
