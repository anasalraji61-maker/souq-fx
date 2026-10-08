"""Free server voice (Piper) behind /api/academy/tts when ElevenLabs is missing or fails."""
from fastapi.testclient import TestClient

import elevenlabs_tts
import local_tts
import main


def test_language_detection():
    assert local_tts.language_of("مرحباً بك") == "ar"
    assert local_tts.language_of("Hello trader") == "en"


def test_no_voice_at_all_is_503(monkeypatch):
    monkeypatch.setattr(elevenlabs_tts, "configured", lambda: False)
    monkeypatch.setattr(local_tts, "available", lambda lang: False)
    r = TestClient(main.app).post("/api/academy/tts", json={"text": "مرحبا"})
    assert r.status_code == 503


def test_local_voice_used_and_served(monkeypatch, tmp_path):
    monkeypatch.setattr(elevenlabs_tts, "configured", lambda: False)
    monkeypatch.setattr(elevenlabs_tts, "CACHE_DIR", tmp_path)
    monkeypatch.setattr(local_tts, "available", lambda lang: True)

    def fake(text, cache_dir):
        p = cache_dir / ("a" * 32 + ".wav")
        p.write_bytes(b"RIFF....WAVE")
        return p

    monkeypatch.setattr(local_tts, "synthesize", fake)
    c = TestClient(main.app)
    r = c.post("/api/academy/tts", json={"text": "درس"})
    assert r.status_code == 200 and r.json()["provider"] == "local"
    a = c.get(r.json()["audio_url"])
    assert a.status_code == 200 and a.headers["content-type"].startswith("audio/wav")


def test_elevenlabs_failure_falls_back_to_local(monkeypatch, tmp_path):
    monkeypatch.setattr(elevenlabs_tts, "configured", lambda: True)
    monkeypatch.setattr(elevenlabs_tts, "CACHE_DIR", tmp_path)

    def boom(text, voice_id=None):
        raise RuntimeError("ElevenLabs 401: quota")

    monkeypatch.setattr(elevenlabs_tts, "synthesize", boom)
    monkeypatch.setattr(local_tts, "available", lambda lang: True)
    def fake(text, d):
        p = d / ("b" * 32 + ".mp3")
        p.write_bytes(b"ID3")
        return p

    monkeypatch.setattr(local_tts, "synthesize", fake)
    r = TestClient(main.app).post("/api/academy/tts", json={"text": "Lesson"})
    assert r.status_code == 200 and r.json()["provider"] == "local"
