import express from 'express';
import { matchRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';
import http from 'http';
import { attachWebSocketServer } from './ws/server.js';

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);

app.use(express.json());
app.use('/matches', matchRouter);
app.use('/', commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
















