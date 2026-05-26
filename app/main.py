from fastapi import FastAPI
from schema.validation import Item, Item_put

app = FastAPI(title="FlickVault",version="1.0")