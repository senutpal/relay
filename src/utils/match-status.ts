import { MATCH_STATUS } from '../validation/matches.js';
import * as schema from '../db/schema.js';

type match = typeof schema.matches.$inferSelect;
type status = typeof schema.matchStatusEnum.enumValues[number];

export function getMatchStatus(startTime: string, endTime: string, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    if (now < start) {
        return MATCH_STATUS.SCHEDULED;
    }

    if (now >= end) {
        return MATCH_STATUS.FINISHED;
    }

    return MATCH_STATUS.LIVE;
}

export async function syncMatchStatus(match: match, updateStatus: (status: status) => Promise<void>) {
    const nextStatus = getMatchStatus(match.startTime.toISOString(), match.endTime?.toISOString() || '');
    if (!nextStatus) {
        return match.status;
    }
    if (match.status !== nextStatus) {
        await updateStatus(nextStatus);
        match.status = nextStatus;
    }
    return match.status;
}