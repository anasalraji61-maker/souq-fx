"""ElevenLabs TTS for MATRIX Academy (screen + voice, no avatar)."""
from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

import httpx

def _cache_dir() -> Path:
    """Generated narration is kept next to the database (survives redeploys; each segment is paid for once).
    `MATRIX_AUDIO_CACHE` overrides; without `MATRIX_DB_PATH` (local runs, tests) it stays in the backend folder."""
    env = (os.getenv("MATRIX_AUDIO_CACHE") or "").strip()
    if env:
        return Path(env).expanduser()
    if (os.getenv("MATRIX_DB_PATH") or "").strip():
        return Path(os.environ["MATRIX_DB_PATH"]).expanduser().parent / "audio_cache"
    return Path(__file__).resolve().parent / "audio_cache"


CACHE_DIR = _cache_dir()
CACHE_DIR.mkdir(parents=True, exist_ok=True)

ELEVEN_API = "https://api.elevenlabs.io/v1"
_voice_cache: str | None = None


def _api_key() -> str:
    return (os.getenv("ELEVENLABS_API_KEY") or "").strip()


def configured() -> bool:
    return bool(_api_key())


def _headers(accept: str = "application/json") -> dict[str, str]:
    return {
        "xi-api-key": _api_key(),
        "Accept": accept,
        "Content-Type": "application/json",
    }


def resolve_voice_id() -> str:
    global _voice_cache
    env_id = (os.getenv("ELEVENLABS_VOICE_ID") or "").strip()
    if env_id:
        return env_id
    if _voice_cache:
        return _voice_cache

    with httpx.Client(timeout=30.0) as client:
        r = client.get(f"{ELEVEN_API}/voices", headers=_headers())
        r.raise_for_status()
        voices = r.json().get("voices") or []
        if not voices:
            raise RuntimeError("No ElevenLabs voices on this account")
        # Prefer multilingual / Arabic-labeled voices when present
        preferred = None
        for v in voices:
            labels = v.get("labels") or {}
            blob = " ".join(str(x).lower() for x in labels.values()) + " " + str(v.get("name", "")).lower()
            if "arabic" in blob or "multilingual" in blob or "middle east" in blob:
                preferred = v["voice_id"]
                break
        _voice_cache = preferred or voices[0]["voice_id"]
        return _voice_cache


def synthesize(text: str, voice_id: str | None = None) -> Path:
    """Convert narration text to MP3; cache by hash."""
    key = _api_key()
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY missing")

    clean = (text or "").strip()
    if not clean:
        raise ValueError("empty text")

    vid = (voice_id or resolve_voice_id()).strip()
    if not re.fullmatch(r"[A-Za-z0-9]{10,40}", vid):
        raise ValueError("bad voice id")
    model = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
    digest = hashlib.sha256(f"{vid}|{model}|{clean}".encode("utf-8")).hexdigest()[:32]
    out = CACHE_DIR / f"{digest}.mp3"
    if out.exists() and out.stat().st_size > 0:
        return out

    url = f"{ELEVEN_API}/text-to-speech/{vid}"
    payload = {
        "text": clean,
        "model_id": model,
    }
    with httpx.Client(timeout=90.0) as client:
        r = client.post(
            url,
            headers=_headers("audio/mpeg"),
            json=payload,
            params={"output_format": "mp3_44100_128"},
        )
        if r.status_code >= 400:
            raise RuntimeError(f"ElevenLabs {r.status_code}: {r.text[:400]}")
        # 200 بجسم فارغ أو غير صوتي (JSON/HTML) كان يُحفظ `.mp3` ويُعاد `ok: true` فيُشغَّل ملف فارغ
        ctype = (r.headers.get("content-type") or "").lower()
        if not r.content or not ctype.startswith("audio/"):
            raise RuntimeError(f"ElevenLabs returned no audio ({ctype or 'no content-type'}, {len(r.content)} bytes)")
        out.write_bytes(r.content)
    return out


def status() -> dict:
    voice = None
    err = None
    if configured():
        try:
            voice = resolve_voice_id()
        except Exception as exc:  # noqa: BLE001
            err = str(exc)
    return {
        "configured": configured(),
        "voice_id": voice,
        "error": err,
        "model_id": os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
        "cache_files": len(list(CACHE_DIR.glob("*.mp3"))),
    }
