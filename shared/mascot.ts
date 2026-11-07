/** Mochi's moods: idle acts, a happy hop when a tip arrives, dozing while the user is away. */
export interface Mascot {
  hop(): void;
  doze(away: boolean): void;
}

/** Idle acts and their weights; each is a one-shot CSS class (shared/mochi.css). */
const IDLE_ACTS = ['do-blink', 'do-blink', 'do-blink', 'do-bob', 'do-wiggle', 'do-wiggle'] as const;
/** Pause between idle acts: 3-8 s, so the compositor rests most of the time. */
const nextPause = (): number => 3_000 + Math.random() * 5_000;

/** Restarts a one-shot animation class. */
function play(root: HTMLElement, act: string): void {
  root.classList.remove(act);
  void root.offsetWidth; // reflow, so re-adding the class restarts the animation
  root.classList.add(act);
}

/** Wraps the mascot markup inside `host` (filled from shared/mochi.html) and starts its idle acts. */
export function createMascot(host: HTMLElement): Mascot {
  const root = host.querySelector<HTMLElement>('.mochi');
  if (!root) throw new Error('Mochi: .mochi missing from shared/mochi.html');
  // Keyframes are named mochi-<act>; drop the matching do-<act> class once it ends.
  root.addEventListener('animationend', (e) => root.classList.remove(`do-${e.animationName.replace('mochi-', '')}`));

  const idle = (): void => {
    const act = IDLE_ACTS[Math.floor(Math.random() * IDLE_ACTS.length)] ?? 'do-blink';
    if (!root.classList.contains('is-sleepy')) play(root, act);
    window.setTimeout(idle, nextPause());
  };
  window.setTimeout(idle, nextPause());

  return {
    hop: () => play(root, 'do-hop'),
    doze: (away) => void root.classList.toggle('is-sleepy', away),
  };
}
