import { getCurrentWindow } from '@tauri-apps/api/window';
import { warn } from '@tauri-apps/plugin-log';

/** Pointer travel (px) that turns a press into a drag; below it the press is a tap. */
const DRAG_PX = 4;

/** Press-and-move on `el` drags the window; a press released in place calls `onTap`. Never both. */
export function makeDraggable(el: HTMLElement, onTap: () => void): void {
  let start: { x: number; y: number } | null = null;
  el.addEventListener('pointerdown', (e) => {
    start = e.button === 0 ? { x: e.screenX, y: e.screenY } : null;
  });
  el.addEventListener('pointermove', (e) => {
    if (!start || Math.hypot(e.screenX - start.x, e.screenY - start.y) < DRAG_PX) return;
    start = null;
    getCurrentWindow()
      .startDragging()
      .catch((error: unknown) => void warn(`drag failed: ${String(error)}`));
  });
  el.addEventListener('pointerup', () => {
    if (start) onTap();
    start = null;
  });
  el.addEventListener('pointercancel', () => {
    start = null;
  });
}
