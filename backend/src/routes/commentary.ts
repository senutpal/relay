import { Router } from 'express';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';
import { matchIdParamSchema } from '../validation/matches.js';
import { eq, desc, and, lte } from 'drizzle-orm';

export const commentaryRouter = Router();

const MAX_LIMIT = 100;

commentaryRouter.get('/matches/:id/commentary', async (req, res) => {
  const paramParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({
      message: 'Invalid match ID',
      details: paramParsed.error.flatten()
    });
  }

  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({
      message: 'Invalid query parameters',
      details: queryParsed.error.flatten()
    });
  }

  const { id: matchId } = paramParsed.data;
  const limit = queryParsed.data.limit ?? MAX_LIMIT;

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(
        and(
          eq(commentary.matchId, matchId),
          lte(commentary.createdAt, new Date())
        )
      )
      .orderBy(desc(commentary.createdAt))
      .limit(Math.min(limit, MAX_LIMIT));

    return res.status(200).json({ data });
  } catch (error) {

    console.error('Failed to fetch commentary:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

commentaryRouter.post('/matches/:id/commentary', async (req, res) => {
  const paramParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({
      message: 'Invalid match ID',
      details: paramParsed.error.flatten()
    });
  }

  const bodyParsed = createCommentarySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      message: 'Invalid commentary data',
      details: bodyParsed.error.flatten()
    });
  }

  const { id: matchId } = paramParsed.data;

  try {
    const [result] = await db
      .insert(commentary)
      .values({
        matchId,
        ...bodyParsed.data,
      })
      .returning();

    if (req.app.locals.broadcastCommentary) {
      req.app.locals.broadcastCommentary(matchId, result);
    }

    return res.status(201).json({ data: result });
  } catch (error) {
    console.error('Failed to create commentary:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({ message: 'Commentary sequence already exists for this match' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
});
