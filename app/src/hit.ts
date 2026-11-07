import { invoke } from '@tauri-apps/api/core';
import { warn } from '@tauri-apps/plugin-log';

/** Extra px around each part so edges and the bubble tail stay clickable. */
const PAD = 6;

/**
 * Tells Rust which parts are visible; clicks anywhere else in the window fall through to the apps below.
 * Uses layout boxes (offset*), not transformed ones, so pop-in and hop animations do not shrink them.
 * Parts must sit in the full-window `.stage`, whose origin is the window's.
 */
export function reportHitAreas(parts: readonly HTMLElement[]): void {
  const rects = parts
    .filter((el) => !el.hidden)
    .map((el) => ({ x: el.offsetLeft - PAD, y: el.offsetTop - PAD, w: el.offsetWidth + 2 * PAD, h: el.offsetHeight + 2 * PAD }));
  invoke('set_hit_rects', { rects }).catch((error: unknown) => void warn(`hit areas not sent: ${String(error)}`));
}
