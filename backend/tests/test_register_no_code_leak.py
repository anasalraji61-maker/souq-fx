from fastapi.testclient import TestClient

import main


def test_register_response_has_no_verification_code():
    with TestClient(main.app) as c:
        r = c.post(
            "/api/auth/register",
            json={"username": "leakcheck1", "email": "leak1@example.com", "password": "secret1234", "role": "trader"},
            headers={"X-Install-Id": "c" * 32},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("token")
        assert "verification_code" not in data
