"""CORS origins configuration.

Allowed origins come from the CORS_ORIGINS environment variable
(comma-separated). Falls back to DEFAULT_ORIGINS when unset/blank.
"""

import os

DEFAULT_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]


def parse_origins(raw: str | None) -> list[str]:
    """Parse a comma-separated origins string into a list of origins."""
    if raw is None or not raw.strip():
        return list(DEFAULT_ORIGINS)

    items: list[str] = []
    for item in raw.split(","):
        item = item.strip().removesuffix("/")
        if not item:
            continue
        if item not in items:
            items.append(item)

    if not items:
        return list(DEFAULT_ORIGINS)
    if "*" in items:
        return ["*"]
    return items


def get_cors_origins() -> list[str]:
    """Read CORS_ORIGINS from the environment at call time."""
    return parse_origins(os.environ.get("CORS_ORIGINS"))
