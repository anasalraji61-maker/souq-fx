# MATRIX Charts — Desktop (Electron)

## Modes
| Mode | How | Loads |
|---|---|---|
| **Live (for users)** | `desktop-config.json` with `{"remoteUrl": "https://your-matrix-domain"}` next to the installed exe, or env `MATRIX_REMOTE_URL` | the live web app served by the MATRIX backend — updates reach every desktop user instantly |
| Bundled | `web-build/` folder exists (exported web bundle) | the bundled files via `matrix://app` |
| Dev | `npm run dev` | `MATRIX_WEB_URL` (default `http://127.0.0.1:8081`) |

Priority: Live → Bundled → Dev. `--dev` always uses Dev.

## Features
- Single instance (opening the shortcut again focuses the running window).
- Tray icon (Windows/Linux): closing the window hides it to the tray so price alerts keep working; **Quit** from the tray menu exits.
- Native system notifications: the web app calls `window.matrixDesktop.notify(title, body)` (used for triggered price alerts).
- Window size/position remembered between runs.
- External links open in the default browser; only http/https/mailto are allowed.
- No trading: the desktop shell never places orders (real trading is disabled in MATRIX).

## Build the Windows installer (on a Windows PC)
```
cd desktop
npm install
copy desktop-config.example.json desktop-config.json   (then edit remoteUrl)
npm run dist
```
The installer is written to `desktop/dist/MATRIX-Charts-Setup-<version>.exe`.
Put `desktop-config.json` next to the installed `MATRIX Charts.exe` (or in `%APPDATA%\MATRIX Charts\`).

## macOS
`npm run dist:mac` — must run on a Mac (Apple signing required for public distribution).
