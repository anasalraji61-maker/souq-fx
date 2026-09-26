import twelve_data as td


def test_status_does_not_claim_a_provider_plan():
    # الباقة غير معروفة للخادم — لا نصّ ثابت يدّعيها على /health العامّ.
    st = td.status()
    assert "plan_hint" not in st
    assert st["provider"] == "twelvedata.com"
