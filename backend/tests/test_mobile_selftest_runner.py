#!/usr/bin/env python3
"""
Tests for mobile/scripts/run-selftests.sh
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent.parent
MOBILE_DIR = REPO_ROOT / "mobile"
SELFTEST_SCRIPT = MOBILE_DIR / "scripts" / "run-selftests.sh"
PACKAGE_JSON = MOBILE_DIR / "package.json"
TSX_BIN = REPO_ROOT / "node_modules" / ".bin" / "tsx"


def tsx_available():
    """Check if tsx binary exists and is executable."""
    return TSX_BIN.exists() and os.access(TSX_BIN, os.X_OK)


@pytest.mark.skipif(not tsx_available(), reason="tsx binary not available at repo root")
class TestMobileSelftestRunner:
    """Tests for the mobile selftest runner script."""

    def test_script_is_executable(self):
        """The script file should be executable."""
        assert SELFTEST_SCRIPT.exists(), f"Script not found at {SELFTEST_SCRIPT}"
        assert os.access(SELFTEST_SCRIPT, os.X_OK), f"Script not executable: {SELFTEST_SCRIPT}"

    def test_package_json_has_selftests_script(self):
        """mobile/package.json should have a selftests script."""
        assert PACKAGE_JSON.exists(), f"package.json not found at {PACKAGE_JSON}"
        with PACKAGE_JSON.open("r", encoding="utf-8") as f:
            data = json.load(f)
        assert "scripts" in data, "package.json missing 'scripts' key"
        assert "selftests" in data["scripts"], "package.json scripts missing 'selftests'"
        assert data["scripts"]["selftests"] == "bash scripts/run-selftests.sh"

    def test_passing_selftest(self):
        """A tmp dir with one passing selftest gives exit 0 and '1 passed, 0 failed'."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            selftest_dir = tmp_path / "selftests"
            selftest_dir.mkdir()

            # Create a passing selftest
            passing_test = selftest_dir / "passing.selftest.ts"
            passing_test.write_text(
                "import assert from 'node:assert/strict';\nassert.equal(1, 1);\n",
                encoding="utf-8",
            )

            env = os.environ.copy()
            env["SELFTEST_DIR"] = str(selftest_dir)

            result = subprocess.run(
                ["bash", str(SELFTEST_SCRIPT)],
                capture_output=True,
                text=True,
                cwd=MOBILE_DIR,
                env=env,
            )

            assert result.returncode == 0, f"Expected exit 0, got {result.returncode}. stdout: {result.stdout}, stderr: {result.stderr}"
            assert "1 passed, 0 failed" in result.stdout, f"Expected '1 passed, 0 failed' in output: {result.stdout}"
            assert "PASS" in result.stdout, f"Expected PASS in output: {result.stdout}"

    def test_failing_selftest(self):
        """A tmp dir with one passing and one failing file gives exit 1 and '1 failed'."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            selftest_dir = tmp_path / "selftests"
            selftest_dir.mkdir()

            # Create a passing selftest
            passing_test = selftest_dir / "passing.selftest.ts"
            passing_test.write_text(
                "import assert from 'node:assert/strict';\nassert.equal(1, 1);\n",
                encoding="utf-8",
            )

            # Create a failing selftest
            failing_test = selftest_dir / "failing.selftest.ts"
            failing_test.write_text(
                "import assert from 'node:assert/strict';\nassert.equal(1, 2);\n",
                encoding="utf-8",
            )

            env = os.environ.copy()
            env["SELFTEST_DIR"] = str(selftest_dir)

            result = subprocess.run(
                ["bash", str(SELFTEST_SCRIPT)],
                capture_output=True,
                text=True,
                cwd=MOBILE_DIR,
                env=env,
            )

            assert result.returncode == 1, f"Expected exit 1, got {result.returncode}. stdout: {result.stdout}, stderr: {result.stderr}"
            assert "1 passed, 1 failed" in result.stdout, f"Expected '1 passed, 1 failed' in output: {result.stdout}"
            assert "FAIL" in result.stdout, f"Expected FAIL in output: {result.stdout}"

    def test_empty_dir(self):
        """An empty dir gives exit 0 and '0 passed, 0 failed'."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            selftest_dir = tmp_path / "selftests"
            selftest_dir.mkdir()

            env = os.environ.copy()
            env["SELFTEST_DIR"] = str(selftest_dir)

            result = subprocess.run(
                ["bash", str(SELFTEST_SCRIPT)],
                capture_output=True,
                text=True,
                cwd=MOBILE_DIR,
                env=env,
            )

            assert result.returncode == 0, f"Expected exit 0, got {result.returncode}. stdout: {result.stdout}, stderr: {result.stderr}"
            assert "0 passed, 0 failed" in result.stdout, f"Expected '0 passed, 0 failed' in output: {result.stdout}"

    def test_filter_arg(self):
        """A filter arg that matches only the passing file gives exit 0."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            selftest_dir = tmp_path / "selftests"
            selftest_dir.mkdir()

            # Create a passing selftest with "pass" in name
            passing_test = selftest_dir / "pass_foo.selftest.ts"
            passing_test.write_text(
                "import assert from 'node:assert/strict';\nassert.equal(1, 1);\n",
                encoding="utf-8",
            )

            # Create a failing selftest with "fail" in name
            failing_test = selftest_dir / "fail_bar.selftest.ts"
            failing_test.write_text(
                "import assert from 'node:assert/strict';\nassert.equal(1, 2);\n",
                encoding="utf-8",
            )

            env = os.environ.copy()
            env["SELFTEST_DIR"] = str(selftest_dir)

            # Filter by "pass" - should only run the passing test
            result = subprocess.run(
                ["bash", str(SELFTEST_SCRIPT), "pass"],
                capture_output=True,
                text=True,
                cwd=MOBILE_DIR,
                env=env,
            )

            assert result.returncode == 0, f"Expected exit 0, got {result.returncode}. stdout: {result.stdout}, stderr: {result.stderr}"
            assert "1 passed, 0 failed" in result.stdout, f"Expected '1 passed, 0 failed' in output: {result.stdout}"
            assert "PASS" in result.stdout, f"Expected PASS in output: {result.stdout}"
            assert "FAIL" not in result.stdout, f"Did not expect FAIL in output: {result.stdout}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-p", "no:cacheprovider"])