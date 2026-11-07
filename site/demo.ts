import rawTips from '../shared/tips.json' with { type: 'json' };
import { createBubble } from '../shared/bubble.ts';
import { createMascot } from '../shared/mascot.ts';
import { parseTips } from '../shared/parse-tips.ts';
import { pick, type Reason } from '../shared/tips.ts';

/** One moment the demo acts out: what the user is doing and why Mochi speaks. */
interface Scene {
  readonly label: string;
  readonly reason: Reason;
  readonly app?: string;
  readonly hour: number;
}

const SCENES: readonly Scene[] = [
  { label: 'You open VS Code', reason: 'app', app: 'code', hour: 10 },
  { label: 'Back from a break', reason: 'idle', hour: 11 },
  { label: 'You switch to Excel', reason: 'app', app: 'excel', hour: 14 },
  { label: 'A quiet afternoon', reason: 'timer', hour: 15 },
  { label: 'You open your browser', reason: 'app', app: 'chrome', hour: 16 },
  { label: 'Evening wrap-up', reason: 'timer', hour: 19 },
  { label: 'You open File Explorer', reason: 'app', app: 'explorer', hour: 20 },
  { label: 'Still up late', reason: 'timer', hour: 23 },
];
const SCENE_MS = 6_500;

/** Runs the hero demo: Mochi acts out real tips from tips.json, one scene every few seconds or on a poke. */
export function startDemo(buddy: HTMLElement, box: HTMLElement, label: HTMLElement, scene: HTMLElement, markup: string): void {
  buddy.innerHTML = markup;
  const mascot = createMascot(buddy);
  const bubble = createBubble(box, label, () => {});
  const tips = parseTips(rawTips);
  const recent: string[] = [];
  let index = 0;
  let timer = 0;

  const next = (): void => {
    const s = SCENES[index++ % SCENES.length];
    if (!s) return;
    const tip = pick(tips, s.reason, { app: s.app ?? null, hour: s.hour }, recent);
    if (tip) {
      recent.push(tip.id);
      if (recent.length > 6) recent.shift();
      scene.textContent = s.label;
      bubble.show(tip.text);
      mascot.hop();
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(next, SCENE_MS);
  };

  buddy.addEventListener('click', next);
  // Save work while the tab is hidden; pick up again when it returns.
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(timer);
    if (!document.hidden) timer = window.setTimeout(next, 800);
  });
  timer = window.setTimeout(next, 900);
}
