#!/usr/bin/env bash
set -u

# Resolve the mobile directory (parent of scripts/)
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$MOBILE_DIR"

# Find tsx binary: mobile/node_modules/.bin/tsx first, then ../node_modules/.bin/tsx
TSX=""
if [[ -x "node_modules/.bin/tsx" ]]; then
  TSX="node_modules/.bin/tsx"
elif [[ -x "../node_modules/.bin/tsx" ]]; then
  TSX="../node_modules/.bin/tsx"
else
  echo "ERROR: tsx binary not found in mobile/node_modules/.bin/tsx or ../node_modules/.bin/tsx" >&2
  exit 2
fi

# Search root for selftests (can be overridden by SELFTEST_DIR)
SELFTEST_DIR="${SELFTEST_DIR:-src}"

# Find test files
if [[ $# -eq 0 ]]; then
  # No args: run all *.selftest.ts files under SELFTEST_DIR
  mapfile -t FILES < <(find "$SELFTEST_DIR" -type f -name '*.selftest.ts' | sort)
else
  # Args provided: filter by substring match on path
  mapfile -t ALL_FILES < <(find "$SELFTEST_DIR" -type f -name '*.selftest.ts' | sort)
  FILES=()
  for f in "${ALL_FILES[@]}"; do
    for arg in "$@"; do
      if [[ "$f" == *"$arg"* ]]; then
        FILES+=("$f")
        break
      fi
    done
  done
fi

passed=0
failed=0

for f in "${FILES[@]}"; do
  # Run with timeout 60 seconds
  output=$(timeout 60 "$TSX" "$f" 2>&1)
  rc=$?
  if [[ $rc -eq 0 ]]; then
    echo "PASS $f"
    ((passed++))
  else
    echo "FAIL $f"
    # Print last 5 lines of output on failure
    echo "$output" | tail -5
    ((failed++))
  fi
done

echo "$passed passed, $failed failed"
if [[ $failed -gt 0 ]]; then
  exit 1
else
  exit 0
fi