from fastapi import FastAPI
from schema.validation import Item, ItemUpdate

app = FastAPI(title="FlickVault",version="1.0")