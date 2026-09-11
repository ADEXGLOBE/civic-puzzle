# Civic Puzzle reliability release

## What was fixed

- API requests no longer wait indefinitely for RSS or dictionary providers.
- Stored puzzles are returned immediately while live news refreshes in the background.
- Duplicate upstream feed requests are deduplicated and successful results are cached.
- Puzzle, fact, and crossword generation no longer performs serial dictionary lookups.
- The app shows saved or bundled challenges immediately and refreshes in the background.
- Mobile requests stop after 8 seconds instead of displaying an endless spinner.
- Expo Go uses a sponsor fallback instead of crashing on the native AdMob module.
- Installed Android/iOS builds continue to use native AdMob.
- Live hints now request the exact active puzzle word from `/api/hints/:word`.
- Hints progress through a definition, headline context, opening letters, length, and pattern.
- Definitions use a built-in headline dictionary first, then two live dictionary providers in parallel, and cache successful results.
- The app does not deduct coins when no meaningful dictionary definition can be returned.
- Numeric text and punctuation are no longer incorrectly presented as letter puzzles.
- If the dictionary is unavailable, the app supplies a clue tied to the current headline.
- The production API URL is the default; local development uses an environment override.
- `/api/health` provides a quick deployment health check.

## Local test on a physical phone

Start the backend:

```powershell
cd C:\Users\adexg\CivicPuzzleApp\backend
npm install
node server.js
```

In a second PowerShell terminal, substitute the computer's current LAN IP:

```powershell
cd C:\Users\adexg\CivicPuzzleApp
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.10:5000"
$env:EXPO_NO_DOCTOR="1"
npx expo start --go --lan --clear
```

The phone and computer must be on the same network. Confirm the backend with:

```text
http://192.168.1.10:5000/api/health
```

## Production deployment

The app defaults to:

```text
https://civic-puzzle.onrender.com
```

Deploy the updated `backend` folder to the existing Render service, then confirm:

```text
https://civic-puzzle.onrender.com/api/health
https://civic-puzzle.onrender.com/api/puzzles?city=Ballarat&radius=local
```

Configure these environment variables on Render:

```text
NODE_ENV=production
ADMIN_TOKEN=<a long random secret>
NEWS_FETCH_TIMEOUT_MS=4000
DICTIONARY_FETCH_TIMEOUT_MS=3500
```

Do not upload `backend/.env` to GitHub or Render.

## Store builds

Android production build:

```powershell
eas build --profile production --platform android
```

iOS development or production builds require an active paid Apple Developer Program team:

```powershell
eas build --profile development --platform ios
```

After Apple enrollment is active, EAS can manage the certificates and device registration.
