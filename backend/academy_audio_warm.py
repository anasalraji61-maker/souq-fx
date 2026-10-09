"""Warm the narration cache in the background so a lesson plays without waiting for the voice to be generated.

Runs once on the leader worker after start-up, only when the free voice (Piper) is installed and ElevenLabs is
not configured, and only when MATRIX_PREGEN_AUDIO=1 (off by default: it is CPU heavy). Already generated files are skipped (the cache is keyed by the text). Switch off with
MATRIX_PREGEN_AUDIO=0.
"""
from __future__ import annotations

import os
import sys
import threading
import time


def _run() -> None:
    import academy_data
    import elevenlabs_tts as tts
    import local_tts

    time.sleep(20)  # let the server settle first
    done = failed = 0
    for lec_id, langs in academy_data.LESSON_CONTENT.items():
        for code in ("ar", "en"):
            if not local_tts.available(code):
                continue
            for seg in langs.get(code, []):
                text = seg["narration"]
                try:
                    local_tts.synthesize(text, tts.CACHE_DIR)
                    done += 1
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    print(f"[tts-warm] {lec_id} {seg['id']}: {exc}")
                time.sleep(0.3)
    print(f"[tts-warm] finished: {done} ok, {failed} failed")


def start() -> None:
    if os.getenv("MATRIX_PREGEN_AUDIO", "0") != "1" or "pytest" in sys.modules:
        return
    import elevenlabs_tts as tts
    import local_tts

    if tts.configured() or not local_tts.configured():
        return
    threading.Thread(target=_run, name="tts-warm", daemon=True).start()
