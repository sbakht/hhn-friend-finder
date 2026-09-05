# Friend Locator

A simple proof-of-concept web app for sharing your location with friends in real time. Everyone joins the same room code and appears as colored dots on a shared map.

## How it works

1. Open the app and enter your name.
2. Create or enter a **room code** (friends use the same code).
3. Allow location access when prompted.
4. Share the invite link — friends who join the room show up on the map live.

## Tech stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Socket.io** for real-time location sync
- **Leaflet** + OpenStreetMap tiles (no API key required)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123) on your computer.

## Use from your phone

`127.0.0.1` and `localhost` only work on the computer running the app. Your phone needs a different URL.

### Option 1: Same Wi-Fi (easiest)

1. Clone this repo and run it on your **own computer** (not the Cloud Agent preview).
2. Make sure your phone is on the **same Wi-Fi** as that computer.
3. Start the app: `npm run dev`
4. The terminal prints your LAN address, e.g. `http://192.168.1.42:43123`
5. Open that URL in your phone's browser.

**iPhone note:** Safari often blocks location on plain `http://` pages. If location doesn't work, use Option 2.

### Option 2: HTTPS tunnel (works on iPhone)

Expose your local server with a free HTTPS tunnel:

```bash
# Terminal 1
npm run dev

# Terminal 2
npx localtunnel --port 43123
```

Open the `https://....loca.lt` URL on your phone. Share that link with friends so everyone joins the same room.

### Option 3: Two phones on the same computer

Open two browser tabs on your computer, or use desktop + phone with Option 1 or 2.

## Notes

- Room state is stored in memory on the server and resets when the server restarts.
- Location updates are sent about every 3 seconds.
- This is a POC — there is no authentication, persistence, or encryption beyond what HTTPS provides in production.
