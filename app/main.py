from fastapi import FastAPI, Query, Depends, Path, HTTPException
from fastapi.responses import JSONResponse
from schema.validation import Item, ItemUpdate

app = FastAPI(title="FlickVault",version="1.0")