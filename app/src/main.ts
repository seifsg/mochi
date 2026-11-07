import './style.css';
import mochiMarkup from '../../shared/mochi.html?raw';
import rawTips from '../../shared/tips.json' with { type: 'json' };
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { warn } from '@tauri-apps/plugin-log';
import { parseTips } from '../../shared/parse-tips.ts';
import { createBrain, type Brain, type Reading } from './brain.ts';
import { createBubble } from '../../shared/bubble.ts';
import { makeDraggable } from './drag.ts';
import { reportHitAreas } from './hit.ts';
import { createMascot } from '../../shared/mascot.ts';

/** How often Mochi asks the OS for idle time and the foreground app. */
const POLL_MS = 3_000;

/** Element by id; a missing one is a broken build, so fail loudly. */
function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Mochi: #${id} missing from index.html`);
  return el;
}

/** Feeds the brain one OS reading, then schedules the next (no overlap even if a read is slow). */
async function poll(brain: Brain): Promise<void> {
  try {
    brain.sense(await invoke<Reading>('context'));
  } catch (error) {
    void warn(`context read failed: ${String(error)}`);
  }
  window.setTimeout(() => void poll(brain), POLL_MS);
}

/** Boots Mochi: mascot, bubble, brain, then the sensing loop. */
function boot(): void {
  const buddy = byId('buddy');
  buddy.innerHTML = mochiMarkup;
  const mascot = createMascot(buddy);
  const bubbleBox = byId('bubble');
  const syncHits = (): void => reportHitAreas([buddy, bubbleBox]);
  const bubble = createBubble(bubbleBox, byId('bubble-text'), syncHits);
  syncHits();
  const speak = (text: string): void => {
    bubble.show(text);
    mascot.hop();
  };
  const brain = createBrain(parseTips(rawTips), speak, mascot.doze);
  // Tap: hide the open bubble, or poke Mochi for a tip.
  makeDraggable(byId('stage'), () => (bubble.isOpen() ? bubble.hide() : brain.say('manual')));
  // Tray (and a second launch) talk to the UI through these events; names match src-tauri/src/tray.rs.
  const failed = (error: unknown): void => void warn(`tray events unavailable: ${String(error)}`);
  listen('tray://tip-now', () => brain.say('manual')).catch(failed);
  listen<boolean>('tray://muted', ({ payload }) => {
    brain.mute(payload);
    if (payload) bubble.hide();
  }).catch(failed);
  void poll(brain);
}

boot();
