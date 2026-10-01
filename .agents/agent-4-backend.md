# Agent 4 Mission: Quantitative Python Backend & Streaming Feeds
**Target Area**: `/backend/`

## Core Responsibilities:
1. Maintain FastAPI server providing endpoints for live candle data, economic calendar, and market signals.
2. Manage Twelve Data WebSocket and REST fallback pipeline for real-time Forex and Commodities ticks.
3. Manage background alert worker thread checking trigger conditions every 500ms.
4. Ensure robust error handling, caching, and rate-limit mitigation.
5. Strictly zero crypto symbols.
