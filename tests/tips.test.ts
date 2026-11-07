import { test } from 'node:test';
import assert from 'node:assert/strict';
import raw from '../shared/tips.json' with { type: 'json' };
import { parseTips } from '../shared/parse-tips.ts';
import { BUCKETS, bucketOf, isForApp, pick, type Tip } from '../shared/tips.ts';
import { AWAY_SECS, COOLDOWN_MS, FIRST_WATCH, TIMER_MS, trigger } from '../shared/trigger.ts';

const tips = parseTips(raw);
const first = () => 0;
const ids = (list: readonly (Tip | null)[]) => list.map((t) => t?.id ?? null);

test('tips.json is valid and every pool has tips', () => {
  for (const hour of [6, 13, 19, 23]) assert.ok(pick(tips, 'timer', { app: null, hour }, []), `no tip at ${hour}h`);
  assert.ok(tips.some((t) => t.idle), 'no welcome-back tips');
  assert.ok(tips.some((t) => isForApp(t, 'code')), 'no VS Code tips');
  assert.throws(() => parseTips([{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }]), /duplicate id/);
  assert.throws(() => parseTips([{ id: 'a', text: 'x', mood: 1 }]), /unknown key/);
  assert.throws(() => parseTips([{ id: 'a', text: 'x', idle: true, apps: ['code'] }]), /only one/);
});

test('pick follows app > idle > time of day', () => {
  const moment = { app: 'excel', hour: 9 };
  assert.ok(pick(tips, 'app', moment, [], first)?.apps?.includes('excel'));
  assert.equal(pick(tips, 'idle', moment, [], first)?.idle, true);
  const timed = pick(tips, 'start', moment, [], first);
  assert.ok(timed && !timed.apps && !timed.idle && (timed.times?.includes('morning') ?? true));
  assert.ok(pick(tips, 'manual', moment, [], first)?.apps?.includes('excel'), 'manual prefers the app');
  assert.ok(!pick(tips, 'manual', { app: 'unknownapp', hour: 9 }, [], first)?.apps, 'manual falls back to time');
  assert.equal(pick(tips, 'app', { app: 'unknownapp', hour: 9 }, []), null);
});

test('pick never repeats a recent tip and stays quiet on a spent one-tip pool', () => {
  const pool: Tip[] = [
    { id: 'a', text: 'A', apps: ['x'] },
    { id: 'b', text: 'B', apps: ['x'] },
    { id: 'solo', text: 'S', apps: ['y'] },
  ];
  const at = (app: string) => ({ app, hour: 9 });
  assert.deepEqual(ids([pick(pool, 'app', at('x'), ['a'], first), pick(pool, 'app', at('x'), ['b'], first)]), ['b', 'a']);
  assert.equal(pick(pool, 'app', at('x'), ['b', 'a'], first)?.id, 'b', 'all recent: anything but the last');
  assert.equal(pick(pool, 'app', at('y'), ['solo'], first), null);
});

test('bucketOf maps hours and rejects bad ones', () => {
  assert.deepEqual([4, 5, 11, 12, 16, 17, 21, 22].map(bucketOf), ['night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night']);
  assert.equal(BUCKETS.length, 4);
  assert.throws(() => bucketOf(24), RangeError);
});

test('trigger: start, back from idle, new app after cooldown, timer', () => {
  const has = (app: string) => app === 'code';
  const t0 = 1_000_000;
  const start = trigger(FIRST_WATCH, { idleSecs: 0, app: 'code' }, t0, has);
  assert.equal(start.reason, 'start');
  assert.equal(trigger(start.watch, { idleSecs: 0, app: 'excel' }, t0 + 1000, has).reason, null, 'cooldown');
  const away = trigger(start.watch, { idleSecs: AWAY_SECS, app: 'code' }, t0 + 5000, has);
  assert.equal(away.reason, null);
  assert.equal(trigger(away.watch, { idleSecs: 1, app: 'code' }, t0 + 6000, has).reason, 'idle');
  const other = trigger(start.watch, { idleSecs: 0, app: 'notepad' }, t0 + COOLDOWN_MS, has);
  assert.equal(other.reason, null, 'app without tips');
  assert.equal(trigger(other.watch, { idleSecs: 0, app: 'code' }, t0 + COOLDOWN_MS + 1, has).reason, 'app');
  assert.equal(trigger(start.watch, { idleSecs: 0, app: 'code' }, t0 + TIMER_MS, has).reason, 'timer');
  assert.equal(trigger(away.watch, { idleSecs: AWAY_SECS + 9, app: 'code' }, t0 + TIMER_MS, has).reason, null, 'no timer while away');
  const startedAway = trigger(FIRST_WATCH, { idleSecs: AWAY_SECS + 20, app: 'code' }, t0, has);
  assert.equal(startedAway.reason, null, 'no start tip to an empty desk');
  assert.equal(trigger(startedAway.watch, { idleSecs: 0, app: 'code' }, t0 + 3000, has).reason, 'idle', 'welcome back instead');
  const inNotepad = trigger(FIRST_WATCH, { idleSecs: 0, app: 'notepad' }, t0, has);
  const switchedEarly = trigger(inNotepad.watch, { idleSecs: 0, app: 'code' }, t0 + 1000, has);
  assert.equal(switchedEarly.reason, null, 'cooldown');
  assert.equal(trigger(switchedEarly.watch, { idleSecs: 0, app: 'code' }, t0 + COOLDOWN_MS, has).reason, 'app', 'switch made in the cooldown still counts');
  const idleStart = trigger(FIRST_WATCH, { idleSecs: AWAY_SECS + 1, app: 'notepad' }, t0, has);
  assert.equal(trigger(idleStart.watch, { idleSecs: AWAY_SECS + 2, app: 'code' }, t0 + COOLDOWN_MS, has).reason, null, 'no app tip while away');
});
