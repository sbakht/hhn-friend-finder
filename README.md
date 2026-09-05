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

Open [http://localhost:43123](http://localhost:43123).

To test with friends, open the same room link in another browser tab or on another device on the same network.

## Notes

- Room state is stored in memory on the server and resets when the server restarts.
- Location updates are sent about every 3 seconds.
- This is a POC — there is no authentication, persistence, or encryption beyond what HTTPS provides in production.
