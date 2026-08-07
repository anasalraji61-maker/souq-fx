# MATRIX Chart Engine — unique product design

MATRIX is **not** a TradingView clone. Same *capabilities traders need*, different UX and branding.

## What we ship (v1 chart engine)
- Chart types: candles, hollow, Heikin Ashi, OHLC bars, line, area
- Crosshair + OHLC readout
- Zoom / pan window controls
- Lenses (MATRIX concept): Clean / Structure / Momentum / Liquidity
- Indicators: SMA20/50, EMA21, Bollinger, Volume, RSI, MACD, Stoch, ATR
- Draw tools: trend, ray, hline, vline, rect, fib, zone, note
- Watchlist rail (desktop) / pills (phone)
- Focus station modal (tap any frame)
- Multi-frame terminal + DXY hero (product identity)

## Deliberately different from TradingView
- No left vertical icon rail clone
- **Lens modes** instead of dumping 400 indicators in one menu
- **Bottom Matrix Dock** for tools (thumb-first on phone)
- Arabic-first RTL chrome + community / academy / votes stay core
- Teal/navy MATRIX visual language

# Later (advanced)
- Real broker L2 order book (requires paid market-depth feed beyond Twelve Data quote)
- Full Pine Script language (MATRIX ships Pine-lite with crossover/arithmetics)
- Native .exe installer via `cd desktop && npm run dist` (electron-builder)
