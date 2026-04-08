# ytm-jam-server

WebSocket synchronization server for YTM Jam.

## What this module does
- Maintains room playback state as the single source of truth
- Accepts client events and applies state transitions
- Broadcasts `STATE` updates to connected clients in the room

## Before Starting
- Node.js 20+
- npm

## Install
```bash
npm install
```

## Run
Development:
```bash
npm run dev
```

Build + run:
```bash
npm run build
npm start
```

Port:
- Default `3000`
- Override with `PORT`, e.g.:
```bash
PORT=3010 npm run dev
```

## Event protocol (current)
Client -> Server:
- `JOIN { roomId }`
- `PLAY { trackId }`
- `PAUSE`
- `SEEK { time }`
- `QUEUE_ADD { trackId }`
- `SKIP`

Server -> Client:
- `STATE { state }`

## Local smoke test
1. Start server:
```bash
npm run dev
```
2. In `ytm-jam-cli`, run:
```bash
./target/debug/ytmjam create study
./target/debug/ytmjam play "https://music.youtube.com/watch?v=abc123" --room study
```

## Troubleshooting
- `EADDRINUSE`: port already in use, change `PORT`
- No client sync: verify clients are joining same `roomId`
