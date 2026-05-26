import json
import os
from pathlib import Path
from typing import List, Dict
from fastapi import HTTPException

TARGET = Path("data","db.json")

def process_data(target:Path = TARGET) -> List[Dict]:
  if not os.path.exists(target):
    raise HTTPException(status_code=500,detail="Database file not found")
  else:
    with open(target,"r",encoding="utf-8") as file:
      return json.load(file)

def save_data(value:List[Dict],target:Path = TARGET) -> None:
  if not os.path.exists(target):
    raise HTTPException(status_code=500,detail="Database file not found")
  else: 
    try:
      with open(target,"w",encoding="utf-8") as file:
        json.dump(value,target,indent=2,ensure_ascii=False)
    except Exception as e:
      raise HTTPException(status_code=500, detail=f"{str(e)}")
  
def add_data(value:Dict) -> Dict:
  whole:List[Dict] = process_data()
  if any(r["imdb_id"] == value["imdb_id"] for r in whole):
    raise HTTPException(
      status_code=422, detail=f"ID = {value["imdb_id"]} already exists"
    )
  else:
    whole = whole.append(value)
    save_data(whole)
    return value

def delete_data(imdb_id:str) -> Dict:
  whole:List[Dict] = process_data()
  existing = [r for r in whole if r["imdb_id"] == imdb_id]
  if not existing:
    raise HTTPException(
      status_code=404,detail=f"ID = {imdb_id} does not exist"
    )
  else:
    whole = [r for r in whole if r["imdb_id"] != imdb_id]
    save_data(whole)
    return existing[0]

def update_data(value:Dict) -> None:
  imdb_id:str = value["imdb_id"]
  whole:List[Dict] = process_data()
  existing = [r for r in whole if r["imdb_id"] == imdb_id]
  if not existing:
    raise HTTPException(
      status_code=404,detail=f"ID = {imdb_id} does not exist"
    )
  else:
    delete_data(imdb_id)
    add_data(value)
