import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest


MOBILE_DIR = Path(__file__).parent.parent.parent / "mobile"
APP_JSON = MOBILE_DIR / "app.json"
README = MOBILE_DIR / "README.md"
CHECK_SCRIPT = MOBILE_DIR / "scripts" / "check-app-json.mjs"


def test_app_json_parses_and_extra_apiurl_empty():
    text = APP_JSON.read_text(encoding="utf-8")
    data = json.loads(text)
    assert data["expo"]["extra"].get("apiUrl", "") == ""


def test_app_json_no_private_ip():
    text = APP_JSON.read_text(encoding="utf-8")
    private_ip_re = re.compile(r"\b(192\.168|10\.\d+|172\.(1[6-9]|2\d|3[01]))\.\d+(\.\d+)?\b")
    assert not private_ip_re.search(text)


def test_readme_exists_and_contains_expo_public_api_url_and_8110():
    assert README.exists()
    text = README.read_text(encoding="utf-8")
    assert "EXPO_PUBLIC_API_URL" in text
    assert "8110" in text


def test_check_app_json_script_returns_zero():
    if shutil.which("node") is None:
        pytest.skip("node not available")
    result = subprocess.run(
        [sys.executable, "-m", "node", str(CHECK_SCRIPT)],
        capture_output=True,
        text=True,
        cwd=MOBILE_DIR,
    )
    # The script is run with `node` directly, not `python -m node`
    # Let me fix this
    result = subprocess.run(
        ["node", str(CHECK_SCRIPT)],
        capture_output=True,
        text=True,
        cwd=MOBILE_DIR,
    )
    assert result.returncode == 0, f"stdout: {result.stdout}, stderr: {result.stderr}"
    assert result.stdout.strip() == "ok"


def test_check_app_json_script_fails_on_bad_app_json(tmp_path):
    if shutil.which("node") is None:
        pytest.skip("node not available")

    # Copy the script
    script_dest = tmp_path / "scripts" / "check-app-json.mjs"
    script_dest.parent.mkdir(parents=True)
    script_dest.write_text(CHECK_SCRIPT.read_text(encoding="utf-8"), encoding="utf-8")

    # Create a bad app.json with extra.apiUrl containing a LAN IP
    bad_app_json = {
        "expo": {
            "name": "Test",
            "extra": {
                "apiUrl": "http://192.168.1.5:8110"
            }
        }
    }
    app_json_dest = tmp_path / "app.json"
    app_json_dest.write_text(json.dumps(bad_app_json), encoding="utf-8")

    # Run the script from the tmp_path/scripts directory
    result = subprocess.run(
        ["node", str(script_dest)],
        capture_output=True,
        text=True,
        cwd=script_dest.parent,
    )
    assert result.returncode == 1