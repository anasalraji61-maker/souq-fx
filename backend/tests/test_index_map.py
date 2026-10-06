import twelve_data as market


def test_index_map_parsing_accepts_only_known_indices():
    m = market._load_index_map(" us30 = DJI , NAS100=NDX,FOO=BAR, SPX500=SPX;rm -rf ,GER40=")
    assert m == {"US30": "DJI", "NAS100": "NDX"}


def test_indices_unavailable_by_default():
    # no MATRIX_INDEX_MAP in the test environment
    for sym in market.INDEX_SYMBOLS:
        if sym not in market.INDEX_MAP:
            assert market.unavailable_reason(sym) == "not_offered_by_provider"


def test_mapped_index_resolves(monkeypatch):
    monkeypatch.setitem(market.INDEX_MAP, "US30", "DJI")
    assert market.td_symbol("US30") == "DJI"
