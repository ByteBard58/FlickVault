import os
from pathlib import Path


def load_local_env(path: str = ".env") -> None:
  env_path = Path(path)
  if not env_path.exists():
    return

  for raw_line in env_path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
      continue

    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip().strip('"').strip("'")
    os.environ.setdefault(key, value)


def get_env(*names: str, default: str | None = None) -> str | None:
  for name in names:
    value = os.getenv(name)
    if value:
      return value
  return default


load_local_env()
