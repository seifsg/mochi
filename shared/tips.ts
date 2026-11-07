/** Part of the day a tip fits. */
export type Bucket = 'morning' | 'afternoon' | 'evening' | 'night';

/** Why Mochi speaks now. */
export type Reason = 'start' | 'app' | 'idle' | 'timer' | 'manual';

/** One tip from tips.json: app tip (`apps`), welcome-back tip (`idle`), else time-of-day or general tip. */
export interface Tip {
  readonly id: string;
  readonly text: string;
  readonly apps?: readonly string[];
  readonly idle?: true;
  readonly times?: readonly Bucket[];
}

/** What Mochi knows right now: foreground app key (exe name, lowercase) and local hour. */
export interface Moment {
  readonly app: string | null;
  readonly hour: number;
}

export const BUCKETS: readonly Bucket[] = ['morning', 'afternoon', 'evening', 'night'];

/** Maps an hour (0-23) to its bucket: night 22-4, morning 5-11, afternoon 12-16, evening 17-21. */
export function bucketOf(hour: number): Bucket {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError(`hour ${hour} is outside 0-23`);
  if (hour < 5 || hour >= 22) return 'night';
  if (hour < 12) return 'morning';
  return hour < 17 ? 'afternoon' : 'evening';
}

/** True when the tip is written for this app. */
export const isForApp = (tip: Tip, app: string | null): boolean => app !== null && (tip.apps?.includes(app) ?? false);

/** Time-of-day and general tips that fit this hour. */
const timeTips = (tips: readonly Tip[], hour: number): Tip[] => {
  const bucket = bucketOf(hour);
  return tips.filter((t) => !t.apps && !t.idle && (t.times?.includes(bucket) ?? true));
};

/** Candidate pools for a reason, best first: app > idle > time of day. */
function poolsFor(tips: readonly Tip[], reason: Reason, moment: Moment): Tip[][] {
  const app = tips.filter((t) => isForApp(t, moment.app));
  switch (reason) {
    case 'app':
      return [app];
    case 'idle':
      return [tips.filter((t) => t.idle)];
    case 'manual':
      return [app, timeTips(tips, moment.hour)];
    case 'start':
    case 'timer':
      return [timeTips(tips, moment.hour)];
  }
}

/**
 * Picks the tip to show, or null to stay quiet.
 * Skips `recent` ids; never repeats the last one, so a one-tip pool stays quiet instead of nagging.
 */
export function pick(
  tips: readonly Tip[],
  reason: Reason,
  moment: Moment,
  recent: readonly string[],
  rand: () => number = Math.random,
): Tip | null {
  const last = recent.at(-1);
  for (const pool of poolsFor(tips, reason, moment)) {
    const fresh = pool.filter((t) => !recent.includes(t.id));
    const options = fresh.length > 0 ? fresh : pool.filter((t) => t.id !== last);
    if (options.length > 0) return options[Math.floor(rand() * options.length)] ?? null;
  }
  return null;
}
