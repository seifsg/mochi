import type { Reason } from './tips.ts';

/** Idle seconds after which the user counts as away. */
export const AWAY_SECS = 300;
/** Minimum gap between two automatic tips. */
export const COOLDOWN_MS = 180_000;
/** A tip at least this often while the user is around. */
export const TIMER_MS = 1_200_000;

/** What the OS reports each tick: idle seconds and foreground app key (null when unknown or Mochi itself). */
export interface Sense {
  readonly idleSecs: number;
  readonly app: string | null;
}

/** What Mochi remembers between ticks (`app`: the last foreground app it has taken in). */
export interface Watch {
  readonly started: boolean;
  readonly away: boolean;
  readonly app: string | null;
  readonly lastShown: number;
}

export const FIRST_WATCH: Watch = { started: false, away: false, app: null, lastShown: 0 };

/** Next watch plus the reason to speak now, or null to stay quiet. */
export interface Decision {
  readonly reason: Reason | null;
  readonly watch: Watch;
}

/** Why to speak this tick, by priority: start > back from idle > (after cooldown) new app > timer. */
function reasonFor(watch: Watch, sense: Sense, now: number, away: boolean, appHasTips: (app: string) => boolean): Reason | null {
  if (!watch.started) return away ? null : 'start'; // started while away: stay quiet, welcome back instead
  if (watch.away && !away) return 'idle';
  if (now - watch.lastShown < COOLDOWN_MS) return null;
  if (!away && sense.app !== null && sense.app !== watch.app && appHasTips(sense.app)) return 'app';
  return !away && now - watch.lastShown >= TIMER_MS ? 'timer' : null;
}

/** Decides whether Mochi should speak on this tick; pure, so the rules are testable. */
export function trigger(watch: Watch, sense: Sense, now: number, appHasTips: (app: string) => boolean): Decision {
  if (!Number.isFinite(sense.idleSecs) || sense.idleSecs < 0) throw new RangeError(`idleSecs ${sense.idleSecs} is invalid`);
  const away = sense.idleSecs >= AWAY_SECS;
  const reason = reasonFor(watch, sense, now, away, appHasTips);
  // An app switch is only taken in while Mochi may speak, so one made during the cooldown or while away still counts later.
  const busy = away || now - watch.lastShown < COOLDOWN_MS;
  return {
    reason,
    watch: { started: true, away, app: busy ? watch.app : (sense.app ?? watch.app), lastShown: reason ? now : watch.lastShown },
  };
}
