# 🚨 QA Agent 4: Auto-Remediation & Fault Dispatcher (حلقة التصحيح الذاتي)
**Mission**: Detect failures, identify the responsible developer agent, and generate a remediation ticket forcing them to patch the defect.

## Fault Routing Matrix:
| Error Category | Responsible Agent | Target Directory |
|---|---|---|
| Chart Canvas / Zoom / Coordinate Math / NaN | **Agent 1** | `src/components/terminal/chart/` |
| Mobile Screen / Touch Gesture / Expo | **Agent 2** | `mobile/` |
| Desktop Window / Electron / OS Tray | **Agent 3** | `desktop/` |
| Backend API / WebSocket / TwelveData | **Agent 4** | `backend/` |
| Academy Curricula / Quiz State | **Agent 5** | `src/components/academy/` |
| Lot Calculator / Backtest Math | **Agent 6** | `src/components/tools/` |
| Community Chat / Message State | **Agent 7** | `src/components/community/` |
| TypeScript Types / Build Failure / Git Sync | **Agent 8** | Root / Build scripts |

## Remediation Dispatch Format (`ACTIVE_BUG_TICKET.md`):
When a defect is detected, this file is populated:
```markdown
# 🚨 ACTIVE BUG TICKET: [ISSUE_TITLE]
- **Target Agent**: [Agent Name]
- **Fault Location**: [File and line number]
- **Error Description**: [Exact error message/log]
- **Required Action**: [Step-by-step fix instruction]
- **Resolution Verification**: Must re-run `scripts/qa-auto-heal-pipeline.sh` until GREEN.
```
