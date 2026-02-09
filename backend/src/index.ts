import express from 'express';
import { matchRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';
import http from 'http';
import { attachWebSocketServer } from './ws/server.js';
import { db } from './db/db.js';
import { commentary } from './db/schema.js';
import { and, lte, gt } from 'drizzle-orm';

const app = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);

app.use(express.json());
app.use('/matches', matchRouter);
app.use('/', commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;


let lastSimulationCheck = new Date();

setInterval(async () => {
    const now = new Date();
    try {
        const newEvents = await db
            .select()
            .from(commentary)
            .where(
                and(
                    lte(commentary.createdAt, now),
                    gt(commentary.createdAt, lastSimulationCheck)
                )
            )
            .orderBy(commentary.createdAt);

        for (let i = 0; i < newEvents.length; i++) {
            const event = newEvents[i];
            if (!event) continue;

            const delay = (2000 / newEvents.length) * i;

            setTimeout(() => {
                console.log(` [WS Staggered] Match ${event.matchId}: ${event.message}`);
                broadcastCommentary(event.matchId, event);
            }, delay);
        }
        lastSimulationCheck = now;
    } catch (error) {
        console.error('Simulation engine error:', error);
    }
}, 2000);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

















