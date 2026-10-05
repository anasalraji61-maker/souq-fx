# MATRIX Mobile

MATRIX mobile app — Expo / React Native.

## API Host Resolution Order

The app resolves the API host in this order (from `mobile/src/apiHost.ts` header):

1. `EXPO_PUBLIC_API_URL` — takes precedence over everything else.
2. Web: the page host plus `:8110` (`localhost` becomes `127.0.0.1`).
3. Dev on a phone: the Metro host (`hostUri` = `192.168.x.x:8081`) plus `:8110`; absent in standalone builds.
4. `extra.apiUrl` as a fallback, then `http://127.0.0.1:8110`.

## How to Set the Production API URL

Set `EXPO_PUBLIC_API_URL` to your production API base URL, e.g.:

```
EXPO_PUBLIC_API_URL=https://api.example.com
```

You can provide it in three ways:

### 1. Shell export before `npx expo start`

```bash
export EXPO_PUBLIC_API_URL=https://api.example.com
npx expo start
```

### 2. `.env` file (not committed)

Create a `.env` file in the `mobile/` directory:

```
EXPO_PUBLIC_API_URL=https://api.example.com
```

The `.env` file is in `.gitignore` and must not be committed.

### 3. `env` in `eas.json` build profile

The `mobile/eas.json` defines `preview` and `production` build profiles. Add an `env` object to the profile you use:

```json
{
  "build": {
    "production": {
      "environment": "production",
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.example.com"
      }
    }
  }
}
```

## `app.json` `extra.apiUrl` Must Stay Empty

Never commit a LAN IP (e.g., `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) in `app.json`. The `extra.apiUrl` must remain empty or absent. The check script enforces this.

## Type Check

Run the TypeScript type checker:

```bash
node_modules/.bin/tsc --noEmit -p .
```