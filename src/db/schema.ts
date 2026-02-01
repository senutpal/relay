import { pgTable, pgEnum, uuid, text, integer, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';

export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  sport: text('sport').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  status: matchStatusEnum('status').default('scheduled').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  homeScore: integer('home_score').default(0).notNull(),
  awayScore: integer('away_score').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const commentary = pgTable('commentary', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id')
    .references(() => matches.id, { onDelete: 'cascade' })
    .notNull(),
  minute: integer('minute'),
  sequence: integer('sequence').notNull(),
  period: text('period'),
  eventType: text('event_type').notNull(),
  actor: text('actor'),
  team: text('team'),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  matchIdIdx: index('commentary_match_id_idx').on(table.matchId),
  uniqueSequence: unique('commentary_match_sequence_unique').on(table.matchId, table.sequence),
}));
