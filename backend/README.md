# backend

sports commentary api with express, postgresql, and websockets.

## api endpoints

- `get /matches` - list matches
- `post /matches` - create match
- `get /matches/:id/commentary` - get match commentary
- `post /matches/:id/commentary` - add commentary

## websocket

connect to `ws://localhost:3001/ws` for real-time updates.

## setup

```bash
npm install
npm run dev
```

server runs on port 3001.

## database

uses postgresql with drizzle orm. run migrations with:
```bash
npm run db:migrate
```