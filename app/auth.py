import os
from typing import Dict, List

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_env

security = HTTPBearer(auto_error=False)
_jwks_client = None


def auth_enabled() -> bool:
  return os.getenv("AUTH_DISABLED", "").lower() not in {"1", "true", "yes"}


def public_auth_config() -> Dict:
  return {
    "auth_enabled": auth_enabled(),
    "supabase_url": get_env("SUPABASE_URL"),
    "supabase_anon_key": get_env("SUPABASE_ANON_KEY", "SUPABASE_KEY"),
  }


def _algorithms() -> List[str]:
  configured = os.getenv("SUPABASE_JWT_ALGORITHMS", "RS256,ES256")
  return [algorithm.strip() for algorithm in configured.split(",") if algorithm.strip()]


def _jwks_url() -> str:
  supabase_url = get_env("SUPABASE_URL")
  if not supabase_url:
    raise HTTPException(status_code=500, detail="SUPABASE_URL is not configured")
  return f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _get_jwks_client():
  global _jwks_client
  from jwt import PyJWKClient

  if _jwks_client is None:
    _jwks_client = PyJWKClient(_jwks_url())
  return _jwks_client


def _decode_token(token: str) -> Dict:
  import jwt

  secret = os.getenv("SUPABASE_JWT_SECRET")

  try:
    if secret:
      return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
      )

    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
      token,
      signing_key.key,
      algorithms=_algorithms(),
      audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
    )
  except jwt.PyJWTError:
    raise HTTPException(status_code=401, detail="Invalid authentication token")
  except Exception as exc:
    raise HTTPException(status_code=500, detail=f"Authentication is not configured correctly: {exc}")


def get_current_user(
  credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
  if not auth_enabled():
    return os.getenv("DEV_USER_ID", "local-dev-user")

  if credentials is None:
    raise HTTPException(status_code=401, detail="Missing authentication token")

  payload = _decode_token(credentials.credentials)
  user_id = payload.get("sub")
  if not user_id:
    raise HTTPException(status_code=401, detail="Invalid authentication token")
  return user_id
