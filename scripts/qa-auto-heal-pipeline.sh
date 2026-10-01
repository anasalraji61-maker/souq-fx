#!/usr/bin/env bash
# ==============================================================================
# SOUQ-FX / MATRIX: QA SWARM & AUTO-REMEDIATION PIPELINE
# ==============================================================================
set -e

echo "🔎 [QA SQUAD] Starting Multi-Layer System Inspection..."

TICKET_FILE=".agents/qa/ACTIVE_BUG_TICKET.md"

# 1. TypeScript & Build Check
echo "1️⃣ [QA Inspector] Checking TypeScript compilation & build..."
if ! npm run build --silent; then
  echo "❌ BUILD FAILED! Generating bug ticket for Agent 8..."
  cat << 'EOF' > "$TICKET_FILE"
# 🚨 ACTIVE BUG TICKET: Build Failure
- **Target Agent**: Agent 8 (QA Build Guardian) & Relevant Developer Agent
- **Fault Type**: TypeScript compilation or syntax error.
- **Required Action**: Run `npm run build` locally, check the error logs, fix the type definitions, and re-test.
EOF
  exit 1
fi
echo "✅ Build & TypeScript check: GREEN"

# 2. Iraqi Regulatory & Compliance Check (Zero Crypto)
echo "2️⃣ [QA Inspector] Verifying Iraqi financial regulatory compliance..."
if grep -rnI "BTCUSD\|Bitcoin\|العملات المشفرة" src/ > /dev/null 2>&1; then
  echo "❌ COMPLIANCE VIOLATION! Generating bug ticket for Agent 7..."
  cat << 'EOF' > "$TICKET_FILE"
# 🚨 ACTIVE BUG TICKET: Prohibited Crypto Asset Detected
- **Target Agent**: Agent 7 (Legal & Compliance)
- **Fault Type**: Iraqi regulation violation (Crypto detected in source).
- **Required Action**: Remove any references to BTCUSD, Bitcoin, or crypto assets from src/.
EOF
  exit 1
fi
echo "✅ Iraqi Compliance check: GREEN (0% Crypto)"

# 3. Virtual User Simulation
echo "3️⃣ [QA Virtual User] Executing simulated trader journey..."
if ! npx tsx scripts/tests/virtual-user-simulation.ts; then
  echo "❌ VIRTUAL USER TEST FAILED! Generating bug ticket..."
  cat << 'EOF' > "$TICKET_FILE"
# 🚨 ACTIVE BUG TICKET: Virtual User Test Failure
- **Target Agent**: Agent 1 or Agent 6 (Math/Calculators)
- **Fault Type**: Coordinate drift or lot calculation mathematical anomaly.
- **Required Action**: Inspect `scripts/tests/virtual-user-simulation.ts` logs and fix the underlying formulas.
EOF
  exit 1
fi
echo "✅ Virtual User Simulation: GREEN"

# Clean any existing bug tickets if all passed
rm -f "$TICKET_FILE"
echo "🎉 [QA SQUAD] All checks PASSED! System is completely healthy and ready for production."
