import os

import uvicorn

if __name__ == "__main__":
    try:
        workers = max(1, int(os.getenv("MATRIX_WORKERS", "1") or 1))
    except ValueError:
        workers = 1
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8110,
        reload=False,
        workers=workers,
        # behind Caddy on the same machine: trust its X-Forwarded-For (real visitor IP for rate limits)
        proxy_headers=True,
        forwarded_allow_ips="127.0.0.1",
        timeout_keep_alive=15,
    )
