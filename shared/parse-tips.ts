import { BUCKETS, type Tip } from './tips.ts';

const KEYS = new Set(['id', 'text', 'apps', 'idle', 'times']);
const SLUG = /^[a-z0-9][a-z0-9._-]*$/;
/** Longest tip that still fits the bubble slot above Mochi in the 300 px window. */
export const MAX_TEXT = 120;

/** Throws a readable error naming the bad tip. */
function fail(index: number, problem: string): never {
  throw new TypeError(`tips.json[${index}]: ${problem}`);
}

/** True for a non-empty array of strings that all pass `ok`. */
const isList = (value: unknown, ok: (item: string) => boolean): boolean =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && ok(item));

/** Validates one raw tip and returns it typed. */
function toTip(raw: unknown, index: number): Tip {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(index, 'must be an object');
  const tip = raw as Record<string, unknown>;
  const unknown = Object.keys(tip).find((key) => !KEYS.has(key));
  if (unknown) fail(index, `unknown key "${unknown}"`);
  if (typeof tip['id'] !== 'string' || !SLUG.test(tip['id'])) fail(index, 'id must be a lowercase slug');
  const text = tip['text'];
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT) fail(index, `text must be 1-${MAX_TEXT} chars`);
  if (tip['apps'] !== undefined && !isList(tip['apps'], (a) => SLUG.test(a))) fail(index, 'apps must list lowercase exe names');
  if (tip['idle'] !== undefined && tip['idle'] !== true) fail(index, 'idle must be true or absent');
  if (tip['times'] !== undefined && !isList(tip['times'], (t) => (BUCKETS as readonly string[]).includes(t))) {
    fail(index, `times must list ${BUCKETS.join(', ')}`);
  }
  const kinds = [tip['apps'], tip['idle'], tip['times']].filter((k) => k !== undefined).length;
  if (kinds > 1) fail(index, 'use only one of apps, idle, times');
  return tip as unknown as Tip;
}

/** Validates tips.json where it enters the app: rejects bad shapes and duplicate ids loudly. */
export function parseTips(data: unknown): Tip[] {
  if (!Array.isArray(data) || data.length === 0) throw new TypeError('tips.json: expected a non-empty array');
  const ids = new Set<string>();
  return data.map((raw, index) => {
    const tip = toTip(raw, index);
    if (ids.has(tip.id)) fail(index, `duplicate id "${tip.id}"`);
    ids.add(tip.id);
    return tip;
  });
}
