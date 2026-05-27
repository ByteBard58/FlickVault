"""Vercel handler for FlickVault FastAPI app."""
import sys
import os

# Add the parent directory to the path so we can import the app module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.app import app

# Export the FastAPI app for Vercel's serverless runtime
__all__ = ["app"]
