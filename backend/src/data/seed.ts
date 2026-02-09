import "dotenv/config";
import fs from "fs/promises";
import { db } from '../db/db.js';
import { matches, commentary } from '../db/schema.js';

const DELAY_MS = Number.parseInt(process.env.DELAY_MS || "250", 10);
const NEW_MATCH_DELAY_MIN_MS = 2000;
const NEW_MATCH_DELAY_MAX_MS = 3000;
const DEFAULT_MATCH_DURATION_MINUTES = Number.parseInt(
  process.env.SEED_MATCH_DURATION_MINUTES || "120",
  10,
);
const FORCE_LIVE =
  process.env.SEED_FORCE_LIVE !== "0" &&
  process.env.SEED_FORCE_LIVE !== "false";
const API_URL = process.env.API_URL;
const USE_DB_SEED = process.env.USE_DB_SEED === "true" || !API_URL;

if (!API_URL && !USE_DB_SEED) {
  throw new Error("API_URL is required to seed via REST endpoints, or set USE_DB_SEED=true for direct database seeding.");
}

const DEFAULT_DATA_FILE = new URL("../data/seed.json", import.meta.url);

async function readJsonFile(fileUrl: string | URL) {
  const raw = await fs.readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

async function loadSeedData() {
  const parsed = await readJsonFile(DEFAULT_DATA_FILE);

  if (Array.isArray(parsed)) {
    return { feed: parsed, matches: [] };
  }

  const data = parsed as any;
  if (Array.isArray(data.commentary)) {
    return { feed: data.commentary, matches: data.matches ?? [] };
  }

  if (Array.isArray(data.feed)) {
    return { feed: data.feed, matches: data.matches ?? [] };
  }

  throw new Error(
    "Seed data must be an array or contain a commentary/feed array.",
  );
}

async function seedDatabase() {
  console.log('  Seeding database directly...');

  const { matches: seedMatches, feed: seedCommentary } = await loadSeedData();
  const expandedCommentary = expandFeedForMatches(seedCommentary, seedMatches);

  try {

    await db.delete(commentary);
    await db.delete(matches);
    console.log(' Cleared existing matches and commentary');


    if (seedMatches && seedMatches.length > 0) {
      const baseNow = Date.now();
      const insertedMatches = await db.insert(matches).values(seedMatches.map((match: any, index: number) => {

        const startTime = new Date(baseNow + (index * 60 + 10) * 1000);
        const endTime = new Date(startTime.getTime() + 120 * 60 * 1000);

        return {
          sport: match.sport,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          startTime: startTime,
          endTime: endTime,
          homeScore: match.homeScore || 0,
          awayScore: match.awayScore || 0,
          status: 'live'
        };
      })).returning();

      console.log(` Inserted ${insertedMatches.length} matches`);


      const allMatches = await db.select().from(matches);
      const { feed: seedCommentary } = await loadSeedData();
      const expandedCommentary = expandFeedForMatches(seedCommentary, seedMatches);

      const commentaryValues = expandedCommentary.map((comment: any) => {
        let matchId = comment.matchId;
        let dbMatch: any;

        if (typeof matchId === 'number') {
          const sMatch = seedMatches.find((m: any) => m.id === matchId);
          if (sMatch) {
            dbMatch = allMatches.find(m => m.homeTeam === sMatch.homeTeam && m.awayTeam === sMatch.awayTeam);
            if (dbMatch) matchId = dbMatch.id;
          }
        } else {
          dbMatch = allMatches.find(m => m.id === matchId);
        }

        if (!dbMatch) return null;





        const start = new Date(dbMatch.startTime).getTime();
        const offsetSeconds = (comment.minute || 0) * 10;
        const createdAt = new Date(start + offsetSeconds * 1000);

        return {
          matchId: matchId,
          minute: comment.minute,
          sequence: comment.sequence,
          period: comment.period,
          eventType: comment.eventType,
          actor: comment.actor,
          team: comment.team,
          message: comment.message,
          metadata: comment.metadata,
          tags: comment.tags,
          createdAt: createdAt,
        };
      }).filter((c: any) => c !== null && typeof c.matchId === 'string');

      if (commentaryValues.length > 0) {

        const chunkSize = 500;
        for (let i = 0; i < commentaryValues.length; i += chunkSize) {
          await db.insert(commentary).values(commentaryValues.slice(i, i + chunkSize));
        }
        console.log(` Inserted ${commentaryValues.length} commentary entries with temporal offsets`);
      }
    }

    console.log(' Database seeding completed successfully!');
  } catch (error) {
    console.error(' Database seeding failed:', error);
    throw error;
  }
}

async function fetchMatches(limit = 100) {
  const response = await fetch(`${API_URL}/matches?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch matches: ${response.status}`);
  }
  const payload = await response.json() as any;
  return Array.isArray(payload.data) ? payload.data : [];
}

function parseDate(value: any) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isLiveMatch(match: any) {
  const start = parseDate(match.startTime);
  const end = parseDate(match.endTime);
  if (!start || !end) {
    return false;
  }
  const now = new Date();
  return now >= start && now < end;
}

function buildMatchTimes(seedMatch: any) {
  const now = new Date();
  const durationMs = DEFAULT_MATCH_DURATION_MINUTES * 60 * 1000;

  let start = parseDate(seedMatch.startTime);
  let end = parseDate(seedMatch.endTime);

  if (!start && !end) {
    start = new Date(now.getTime() - 5 * 60 * 1000);
    end = new Date(start.getTime() + durationMs);
  } else {
    if (start && !end) {
      end = new Date(start.getTime() + durationMs);
    }
    if (!start && end) {
      start = new Date(end.getTime() - durationMs);
    }
  }

  if (FORCE_LIVE && start && end) {
    if (!(now >= start && now < end)) {
      start = new Date(now.getTime() - 5 * 60 * 1000);
      end = new Date(start.getTime() + durationMs);
    }
  }

  if (!start || !end) {
    throw new Error("Seed match must include valid startTime and endTime.");
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

async function createMatch(seedMatch: any) {
  const { startTime, endTime } = buildMatchTimes(seedMatch);

  const response = await fetch(`${API_URL}/matches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sport: seedMatch.sport,
      homeTeam: seedMatch.homeTeam,
      awayTeam: seedMatch.awayTeam,
      startTime,
      endTime,
      homeScore: seedMatch.homeScore ?? 0,
      awayScore: seedMatch.awayScore ?? 0,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create match: ${response.status}`);
  }
  const responsePayload = await response.json() as any;
  return responsePayload.data;
}

async function insertCommentary(matchId: string, entry: any) {
  const payload: any = {
    message: entry.message ?? "Update",
  };
  if (entry.minute !== undefined && entry.minute !== null) {
    payload.minute = entry.minute;
  }
  if (entry.sequence !== undefined && entry.sequence !== null) {
    payload.sequence = entry.sequence;
  }
  if (entry.period !== undefined && entry.period !== null) {
    payload.period = entry.period;
  }
  if (entry.eventType !== undefined && entry.eventType !== null) {
    payload.eventType = entry.eventType;
  }
  if (entry.actor !== undefined && entry.actor !== null) {
    payload.actor = entry.actor;
  }
  if (entry.team !== undefined && entry.team !== null) {
    payload.team = entry.team;
  }
  if (entry.metadata !== undefined && entry.metadata !== null) {
    payload.metadata = entry.metadata;
  }
  if (entry.tags !== undefined && entry.tags !== null) {
    payload.tags = entry.tags;
  }

  const response = await fetch(`${API_URL}/matches/${matchId}/commentary`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create commentary: ${response.status}`);
  }
  const responsePayload = await response.json() as any;
  return responsePayload.data;
}

function inningsRank(period: any) {
  if (!period) {
    return 0;
  }
  const lower = String(period).toLowerCase();
  const match = lower.match(/(\d+)(st|nd|rd|th)/);
  if (match) {
    return Number(match[1]) || 0;
  }
  if (lower.includes("first")) {
    return 1;
  }
  if (lower.includes("second")) {
    return 2;
  }
  if (lower.includes("third")) {
    return 3;
  }
  if (lower.includes("fourth")) {
    return 4;
  }
  return 0;
}

function cricketBattingTeam(entry: any, match: any) {
  const rank = inningsRank(entry.period);
  if (rank === 1) {
    return match.homeTeam;
  }
  if (rank === 2) {
    return match.awayTeam;
  }
  return null;
}

function normalizeCricketFeed(entries: any[], match: any) {
  const sorted = [...entries].sort((a, b) => {
    const inningsDiff = inningsRank(a.period) - inningsRank(b.period);
    if (inningsDiff !== 0) {
      return inningsDiff;
    }
    const seqA = Number.isFinite(a.sequence)
      ? a.sequence
      : Number.MAX_SAFE_INTEGER;
    const seqB = Number.isFinite(b.sequence)
      ? b.sequence
      : Number.MAX_SAFE_INTEGER;
    if (seqA !== seqB) {
      return seqA - seqB;
    }
    const minA = Number.isFinite(a.minute) ? a.minute : Number.MAX_SAFE_INTEGER;
    const minB = Number.isFinite(b.minute) ? b.minute : Number.MAX_SAFE_INTEGER;
    return minA - minB;
  });

  const grouped = new Map();
  for (const entry of sorted) {
    const key = inningsRank(entry.period);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(entry);
  }

  const ordered = [];
  const inningsKeys = Array.from(grouped.keys()).sort((a, b) => a - b);

  for (const key of inningsKeys) {
    const inningsEntries = grouped.get(key) || [];
    const primaryTeam = inningsEntries.find(
      (entry: any) => entry.team === match.homeTeam || entry.team === match.awayTeam,
    )?.team;
    const secondaryTeam =
      primaryTeam === match.homeTeam ? match.awayTeam : match.homeTeam;

    const neutral = inningsEntries.filter(
      (entry: any) => !entry.team || entry.team === "neutral",
    );
    const primary = inningsEntries.filter(
      (entry: any) => entry.team === primaryTeam,
    );
    const secondary = inningsEntries.filter(
      (entry: any) => entry.team === secondaryTeam,
    );
    const other = inningsEntries.filter(
      (entry: any) =>
        entry.team &&
        entry.team !== "neutral" &&
        entry.team !== primaryTeam &&
        entry.team !== secondaryTeam,
    );

    ordered.push(...neutral, ...primary, ...secondary, ...other);
  }

  return ordered;
}

function replaceTrailingTeam(message: any, replacements: any) {
  if (typeof message !== "string") {
    return message;
  }
  const match = message.match(/\(([^)]+)\)\s*$/);
  if (!match) {
    return message;
  }
  const nextTeam = replacements.get(match[1]);
  if (!nextTeam) {
    return message;
  }
  return message.replace(/\([^)]+\)\s*$/, `(${nextTeam})`);
}

function cloneCommentaryEntries(entries: any[], templateMatch: any, targetMatch: any) {
  const replacements = new Map([
    [templateMatch.homeTeam, targetMatch.homeTeam],
    [templateMatch.awayTeam, targetMatch.awayTeam],
  ]);

  return entries.map((entry: any) => {
    const next = { ...entry, matchId: targetMatch.id };
    if (entry.team === templateMatch.homeTeam) {
      next.team = targetMatch.homeTeam;
    } else if (entry.team === templateMatch.awayTeam) {
      next.team = targetMatch.awayTeam;
    }
    next.message = replaceTrailingTeam(entry.message, replacements);
    return next;
  });
}

function expandFeedForMatches(feed: any[], seedMatches: any[]) {
  if (!Array.isArray(seedMatches) || seedMatches.length === 0) {
    return feed;
  }

  const byMatchId = new Map();
  for (const entry of feed) {
    if (!Number.isInteger(entry.matchId)) {
      continue;
    }
    if (!byMatchId.has(entry.matchId)) {
      byMatchId.set(entry.matchId, []);
    }
    byMatchId.get(entry.matchId).push(entry);
  }

  const templateBySport = new Map();
  for (const match of seedMatches) {
    if (!templateBySport.has(match.sport) && byMatchId.has(match.id)) {
      templateBySport.set(match.sport, match);
    }
  }

  const expanded = [...feed];
  for (const match of seedMatches) {
    if (byMatchId.has(match.id)) {
      continue;
    }
    const templateMatch = templateBySport.get(match.sport);
    if (!templateMatch) {
      continue;
    }
    const templateEntries = byMatchId.get(templateMatch.id) || [];
    expanded.push(
      ...cloneCommentaryEntries(templateEntries, templateMatch, match),
    );
  }

  return expanded;
}

function buildRandomizedFeed(feed: any[], matchMap: Map<any, any>) {
  const buckets = new Map();
  for (const entry of feed) {
    const key = Number.isInteger(entry.matchId) ? entry.matchId : null;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(entry);
  }

  for (const [matchId, entries] of buckets) {
    if (!Number.isInteger(matchId)) {
      continue;
    }
    const target = matchMap.get(matchId);
    const sport = target?.match?.sport?.toLowerCase();
    if (sport === "cricket" && target?.match) {
      buckets.set(matchId, normalizeCricketFeed(entries, target.match));
    }
  }

  const matchIds = Array.from(buckets.keys());
  const randomized = [];
  let lastMatchId: any = null;

  while (randomized.length < feed.length) {
    const candidates = matchIds.filter(
      (id) => (buckets.get(id) || []).length > 0,
    );
    if (candidates.length === 0) {
      break;
    }

    let selectable = candidates;
    if (lastMatchId !== null && candidates.length > 1) {
      const withoutLast = candidates.filter((id: any) => id !== lastMatchId);
      if (withoutLast.length > 0) {
        selectable = withoutLast;
      }
    }

    const choice = selectable[Math.floor(Math.random() * selectable.length)];
    const nextEntry = buckets.get(choice).shift();
    randomized.push(nextEntry);
    lastMatchId = choice;
  }

  return randomized;
}

function getMatchEntry(entry: any, matchMap: Map<any, any>) {
  if (!Number.isInteger(entry.matchId)) {
    return null;
  }
  return matchMap.get(entry.matchId) ?? null;
}

function randomMatchDelay(): number {
  const range = NEW_MATCH_DELAY_MAX_MS - NEW_MATCH_DELAY_MIN_MS;
  return NEW_MATCH_DELAY_MIN_MS + Math.floor(Math.random() * (range + 1));
}

async function seed() {
  if (USE_DB_SEED) {
    await seedDatabase();
    return;
  }

  console.log(` Seeding via API: ${API_URL}`);

  const { feed, matches: seedMatches } = await loadSeedData();
  const matchesList = await fetchMatches();

  const matchMap = new Map();
  const matchKeyMap = new Map();
  for (const match of matchesList) {
    if (FORCE_LIVE && !isLiveMatch(match)) {
      continue;
    }
    const key = `${match.sport}|${match.homeTeam}|${match.awayTeam}`;
    if (!matchKeyMap.has(key)) {
      matchKeyMap.set(key, match);
    }
    matchMap.set(match.id, {
      match,
      score: { home: match.homeScore ?? 0, away: match.awayScore ?? 0 },
      fakeNext: Math.random() < 0.5 ? "home" : "away",
    });
  }

  if (Array.isArray(seedMatches) && seedMatches.length > 0) {
    for (const seedMatch of seedMatches) {
      const key = `${seedMatch.sport}|${seedMatch.homeTeam}|${seedMatch.awayTeam}`;
      let match = matchKeyMap.get(key);
      if (!match || (FORCE_LIVE && !isLiveMatch(match))) {
        match = await createMatch(seedMatch);
        matchKeyMap.set(key, match);
        const delayMs = randomMatchDelay();
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if (Number.isInteger(seedMatch.id)) {
        matchMap.set(seedMatch.id, {
          match,
          score: { home: match.homeScore ?? 0, away: match.awayScore ?? 0 },
          fakeNext: Math.random() < 0.5 ? "home" : "away",
        });
      }
      matchMap.set(match.id, {
        match,
        score: { home: match.homeScore ?? 0, away: match.awayScore ?? 0 },
        fakeNext: Math.random() < 0.5 ? "home" : "away",
      });
    }
  }

  if (matchMap.size === 0) {
    throw new Error("No matches found or created in the database.");
  }

  const expandedFeed = expandFeedForMatches(feed, seedMatches);
  const randomizedFeed = buildRandomizedFeed(expandedFeed, matchMap);

  for (let i = 0; i < randomizedFeed.length; i += 1) {
    const entry = randomizedFeed[i];
    const target = getMatchEntry(entry, matchMap);
    if (!target) {
      console.warn(
        "  Skipping entry: matchId missing or not found:",
        entry.message,
      );
      continue;
    }
    const match = target.match;

    const row = await insertCommentary(match.id, entry);
    console.log(` [Match ${match.id}] ${row.message}`);

    if (DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
}

seed().catch((err) => {
  console.error(" Seed error:", err);
  process.exit(1);
});
