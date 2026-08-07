# MATRIX Academy — Screen + Voice Pipeline

## Format (updated)
**No on-screen teacher avatar.** Full attention stays on the chart/slide screen.
Narration is **voice-only** via **ElevenLabs** (Arabic TTS).

## Stack
1. **ElevenLabs** — Arabic lecture voice (`Text to Speech`)
2. **Remotion** (optional later) — animated chart overlays on the big screen
3. **TradingView replay / chart exports** — real market examples behind the voice

## App behavior
- Schools → Levels → Full lectures (script segments)
- Screen shows the current segment; voice reads `narration`
- **Interrupt narration**: pause → ask → clarification (voice or text) → resume same segment
- BOS / CHOCH under **ICT/SMC → Order Blocks & FVG**

## Schools order
1. Classical
2. Wyckoff
3. ICT + SMC
4. Gann Square
5. Elliott Waves
6. SK

## Keys (local only — never paste in chat)
1. Open [ElevenLabs](https://elevenlabs.io) → profile / Developers → **API Key**
2. Put in `souq-fx/.env`:

```env
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=optional_arabic_voice_id
```

3. Tell the agent the key is saved locally; generation will use the backend TTS helper.

## Production step
For each `script_segments[].narration` → ElevenLabs TTS → MP3/MP4 with screen slides → set `audio_url` / `video_url` on the lecture.
