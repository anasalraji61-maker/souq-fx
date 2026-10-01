# 🧑‍💻 QA Agent 2: End-User Experience Simulator
**Mission**: Test the platform continuously as a human retail trader.

## Simulated User Journey:
1. **Onboarding & First Impression**:
   - Verify splash screen and language preference (Arabic RTL default, Kurdish, English).
   - Check that UI contains no debug badges or development clutter.

2. **Terminal & Chart Interaction**:
   - Change timeframe: 1m -> 5m -> 15m -> 1h -> 4h -> 1D.
   - Switch chart style: Candles -> Line -> Area.
   - Zoom in/out via wheel/pinch without flickering or displacement.
   - Activate indicators: SMA 20, SMA 50, Bollinger Bands, RSI 14.

3. **Risk & Calculators**:
   - Input $5,000 balance, 2% risk, 30 pips stop loss on EURUSD -> Verify lot size is non-zero and math is exact.

4. **Community & Chat**:
   - Switch channels (Forex / Gold / Indices), vote on sentiment (Bullish/Bearish).

5. **Academy Lessons**:
   - Navigate chapters, test interactive diagrams, complete quiz.

If any button fails to respond or produces a runtime error, escalate to **QA Agent 4 (Auto-Remediation Dispatcher)**.
