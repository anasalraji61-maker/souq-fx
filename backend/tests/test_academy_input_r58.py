"""الأكاديمية/الذكاء: مدخل خاطئ ⇒ 404/422، لا 500 ولا 502 ولا سؤال فارغ للنموذج."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import elevenlabs_tts as tts
import main


@pytest.fixture()
def client():
    return TestClient(main.app, raise_server_exceptions=False)


@pytest.mark.parametrize("file_id", ["a" * 300, "ب" * 130, "../main", "ABCDEF0123456789ABCDEF0123456789"])
def test_audio_bad_id_is_404(client, file_id):
    assert client.get(f"/api/academy/audio/{file_id}").status_code == 404


def test_audio_real_id_served(client, tmp_path, monkeypatch):
    monkeypatch.setattr(tts, "CACHE_DIR", tmp_path)
    fid = "0123456789abcdef0123456789abcdef"
    (tmp_path / f"{fid}.mp3").write_bytes(b"ID3")
    r = client.get(f"/api/academy/audio/{fid}")
    assert r.status_code == 200 and r.content == b"ID3"


def test_tts_blank_text_is_422_not_provider_error(client, monkeypatch):
    monkeypatch.setattr(tts, "configured", lambda: True)
    assert client.post("/api/academy/tts", json={"text": "   "}).status_code == 422


@pytest.mark.parametrize("path,body", [
    ("/api/ai/ask", {"question": "   "}),
    ("/api/academy/interrupt", {"school_id": "x", "lecture_id": "y", "question": "  \n "}),
])
def test_blank_question_is_422(client, path, body):
    assert client.post(path, json=body).status_code == 422
