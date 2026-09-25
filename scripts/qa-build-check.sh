#!/usr/bin/env bash
# بوابة البناء — tsc هو الفاحص الحقيقي. قفل مشترك يمنع أكثر من فحص واحد في وقت واحد.
set -u
cd "$(dirname "$0")/../mobile" || exit 1
[ -d node_modules ] || npm install --no-audit --no-fund >/dev/null 2>&1
OUT=$(flock -w 900 /tmp/matrix-tsc.lock \
      env NODE_OPTIONS=--max-old-space-size=2048 npx tsc --noEmit -p tsconfig.json 2>&1)
N=$(printf '%s\n' "$OUT" | grep -c "error TS")
printf '%s\n' "$OUT" | grep "error TS" | head -60
echo "TOTAL TS ERRORS: $N"
if [ "$N" -eq 0 ]; then echo "BUILD CHECK: GREEN"; exit 0; else echo "BUILD CHECK: RED"; exit 1; fi
