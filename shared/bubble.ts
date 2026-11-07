/** Speech bubble: pops in with a tip, hides on click or after enough time to read it. */
export interface Bubble {
  show(text: string): void;
  hide(): void;
  isOpen(): boolean;
}

const LEAVE_MS = 220;

/** Reading time: 4 s plus ~70 ms per character, kept within 8-20 s. */
export const readingMs = (text: string): number => Math.min(20_000, Math.max(8_000, 4_000 + text.length * 70));

/** Drives the bubble element; `changed` runs after it opens or closes (hit areas follow it). */
export function createBubble(box: HTMLElement, label: HTMLElement, changed: () => void): Bubble {
  let timer = 0;
  const hide = (): void => {
    if (box.hidden || box.classList.contains('is-leaving')) return;
    window.clearTimeout(timer);
    box.classList.add('is-leaving');
    timer = window.setTimeout(() => {
      box.hidden = true;
      box.classList.remove('is-leaving');
      changed();
    }, LEAVE_MS);
  };
  return {
    show(text) {
      window.clearTimeout(timer);
      label.textContent = text;
      box.classList.remove('is-leaving');
      box.hidden = false;
      changed();
      timer = window.setTimeout(hide, readingMs(text));
    },
    hide,
    isOpen: () => !box.hidden && !box.classList.contains('is-leaving'),
  };
}
