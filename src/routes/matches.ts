import { Router } from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { matches } from '../db/schema.js';
import { db } from '../db/db.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';

export const matchRouter = Router();

matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid query', details: parsed.error.flatten() });
    }
  const limit = Math.min(parsed.data.limit ?? 10, 100);
  try {
    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
    return res.status(200).json({ data: data });
  } catch (error) {
    console.error('Failed to list matches:', error);
    return res.status(500).json({ message: 'Failed to list matches' });
  }
});

matchRouter.post('/', async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid match data', details: parsed.error.flatten() });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const status = getMatchStatus(startTime, endTime);
    if (!status) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const [event] = await db.insert(matches).values({
      ...parsed.data,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: status,
    }).returning();

    if(res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(event);
    }

    return res.status(201).json({ data: event });
  } catch (error) {
    console.error('Failed to create match:', error);
    return res.status(500).json({ message: 'Failed to create match' });
  }
});

