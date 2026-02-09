# live sports commentary

a real-time sports commentary platform

## structure

- `backend/` - node.js api with websocket support
- `frontend/` - react 19 spectator interface

## quick start

### backend
```bash
cd backend
npm install
npm run dev
```

### frontend
```bash
cd frontend
npm install
npm run dev
```

backend runs on port 3001, frontend on port 5173.

## features

- real-time match commentary
- websocket updates
- spectator view
- postgresql with drizzle orm