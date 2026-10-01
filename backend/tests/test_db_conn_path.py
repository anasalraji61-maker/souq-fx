"""مسار قاعدة البيانات — `core.db_conn.DB_PATH` ومتغيّر البيئة `MATRIX_DB_PATH`.

**لماذا**: `docs/DEPLOYMENT.md` يشترط قرصاً دائماً لـ`matrix.db`، والمنصّات تُركّب القرص
على مسار تختاره هي (`/data` عادةً) ولا يصحّ تركيبه فوق `/app`. فلو عاد المسار يوماً
ثابتاً داخل الصورة، يصبح الشرط **غير قابل للتنفيذ** وتُمحى قاعدة المتداولين بصمت مع كل
إعادة نشر — بلا أي خطأ ظاهر. هذه الاختبارات تحرس ذلك.

المسار يُحسَب **وقت الاستيراد**، فيُعاد تحميل الوحدة بعد ضبط المتغيّر.
"""
from __future__ import annotations

import importlib

from core import db_conn


def _reload(monkeypatch, value: str | None):
    if value is None:
        monkeypatch.delenv("MATRIX_DB_PATH", raising=False)
    else:
        monkeypatch.setenv("MATRIX_DB_PATH", value)
    return importlib.reload(db_conn)


def test_default_path_is_backend_matrix_db(monkeypatch):
    """بلا المتغيّر: نفس المسار التاريخي حرفياً — لا يتغيّر شيء محليّاً."""
    mod = _reload(monkeypatch, None)
    assert mod.DB_PATH.name == "matrix.db"
    assert mod.DB_PATH.parent.name == "backend"


def test_env_var_overrides_the_path(monkeypatch, tmp_path):
    target = tmp_path / "vol" / "matrix.db"
    mod = _reload(monkeypatch, str(target))
    assert mod.DB_PATH == target


def test_blank_env_var_falls_back_to_default(monkeypatch):
    """متغيّر مضبوط لفراغ (شائع بلوحات الاستضافة) لا يعني مساراً فارغاً."""
    mod = _reload(monkeypatch, "   ")
    assert mod.DB_PATH.parent.name == "backend"


def test_tilde_is_expanded(monkeypatch):
    mod = _reload(monkeypatch, "~/matrix-data/matrix.db")
    assert "~" not in str(mod.DB_PATH)
    assert mod.DB_PATH.is_absolute()


def test_missing_parent_directory_is_created_on_connect(monkeypatch, tmp_path):
    """مجلّد القرص الدائم فارغ عند أول إقلاع — بلا إنشائه يرمي sqlite
    «unable to open database file»، وهي رسالة لا تدلّ على السبب."""
    target = tmp_path / "data" / "nested" / "matrix.db"
    assert not target.parent.exists()
    mod = _reload(monkeypatch, str(target))
    with mod._conn() as c:
        c.execute("CREATE TABLE t(x INTEGER)")
    assert target.parent.is_dir()
    assert target.is_file()


def test_reload_restores_default_for_other_tests(monkeypatch):
    """حارس نظافة: الوحدة تعود لحالتها الافتراضية بعد فكّ monkeypatch."""
    mod = _reload(monkeypatch, None)
    assert mod.DB_PATH.parent.name == "backend"
