"""Free academy narration on the server itself (Piper, open source, runs on the CPU).

Used when ElevenLabs is not configured or fails. Voices are downloaded once by `set_free_voice.sh` into
`<data dir>/piper_voices` (or `MATRIX_PIPER_DIR`): an Arabic voice (Piper adds the Arabic diacritics itself
before speaking) and an English voice. There is no Kurdish voice.
Output is MP3 when ffmpeg is installed (much smaller), otherwise WAV. Audio is cached like ElevenLabs audio,
so every part is generated only once.
"""
from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import threading
import wave
from pathlib import Path

VOICES = {
    "ar": os.getenv("MATRIX_PIPER_VOICE_AR", "ar_JO-kareem-medium"),
    "en": os.getenv("MATRIX_PIPER_VOICE_EN", "en_US-lessac-medium"),
}
_AR = re.compile(r"[؀-ۿ]")
_lock = threading.Lock()
_loaded: dict[str, object] = {}


def voices_dir() -> Path:
    env = (os.getenv("MATRIX_PIPER_DIR") or "").strip()
    if env:
        return Path(env).expanduser()
    if (os.getenv("MATRIX_DB_PATH") or "").strip():
        return Path(os.environ["MATRIX_DB_PATH"]).expanduser().parent / "piper_voices"
    return Path(__file__).resolve().parent / "piper_voices"


def language_of(text: str) -> str:
    return "ar" if _AR.search(text or "") else "en"


def _model(lang: str) -> Path:
    return voices_dir() / f"{VOICES[lang]}.onnx"


def available(lang: str) -> bool:
    if lang not in VOICES or not _model(lang).is_file():
        return False
    try:
        import piper  # noqa: F401
    except ImportError:
        return False
    return True


def configured() -> bool:
    return available("ar") or available("en")


def _voice(lang: str):
    from piper import PiperVoice

    v = _loaded.get(lang)
    if v is None:
        v = PiperVoice.load(_model(lang))
        _loaded[lang] = v
    return v


def synthesize(text: str, cache_dir: Path) -> Path:
    """Narration file for `text` (cached by content). Raises RuntimeError when no voice fits the text."""
    clean = (text or "").strip()
    if not clean:
        raise ValueError("empty text")
    lang = language_of(clean)
    if not available(lang):
        raise RuntimeError(f"no local voice for {lang}")
    digest = hashlib.sha256(f"piper|{VOICES[lang]}|{clean}".encode("utf-8")).hexdigest()[:32]
    cache_dir.mkdir(parents=True, exist_ok=True)
    for ext in (".mp3", ".wav"):
        hit = cache_dir / f"{digest}{ext}"
        if hit.exists() and hit.stat().st_size > 0:
            return hit
    wav_path = cache_dir / f"{digest}.tmp.wav"
    with _lock:  # one synthesis at a time per process: keeps CPU and memory predictable on a small server
        from piper import SynthesisConfig

        voice = _voice(lang)
        with wave.open(str(wav_path), "wb") as wf:
            voice.synthesize_wav(clean, wf, syn_config=SynthesisConfig(length_scale=1.05))
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        mp3 = cache_dir / f"{digest}.mp3"
        r = subprocess.run(
            [ffmpeg, "-loglevel", "error", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-q:a", "5", str(mp3)],
            capture_output=True,
            timeout=120,
        )
        if r.returncode == 0 and mp3.exists() and mp3.stat().st_size > 0:
            wav_path.unlink(missing_ok=True)
            return mp3
    final = cache_dir / f"{digest}.wav"
    wav_path.replace(final)
    return final


def status() -> dict:
    return {
        "configured": configured(),
        "voices": {lang: available(lang) for lang in VOICES},
        "mp3": bool(shutil.which("ffmpeg")),
    }
