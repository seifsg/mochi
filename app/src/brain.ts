import { pick, type Reason, type Tip } from '../../shared/tips.ts';
import { FIRST_WATCH, trigger, type Sense, type Watch } from '../../shared/trigger.ts';
import { debug } from '@tauri-apps/plugin-log';

/** How many recent tips Mochi avoids repeating. */
const RECENT = 5;

/** One `context` reading from Rust: the sensed state plus whether tips are muted. */
export interface Reading extends Sense {
  readonly muted: boolean;
}

/** Mochi's brain: turns what the OS reports into tips, remembering what it already said. */
export interface Brain {
  sense(reading: Reading): void;
  say(reason: Reason): void;
  mute(on: boolean): void;
}

/** `speak` shows a tip; `doze` follows whether the user is away. */
export function createBrain(tips: readonly Tip[], speak: (text: string) => void, doze: (away: boolean) => void): Brain {
  const appsWithTips = new Set(tips.flatMap((t) => t.apps ?? []));
  const recent: string[] = [];
  let watch: Watch = FIRST_WATCH;
  let muted = false;

  const say = (reason: Reason): void => {
    const tip = pick(tips, reason, { app: watch.app, hour: new Date().getHours() }, recent);
    if (!tip) return;
    recent.push(tip.id);
    if (recent.length > RECENT) recent.shift();
    speak(tip.text);
  };

  return {
    sense(sense) {
      muted = sense.muted;
      const decision = trigger(watch, sense, Date.now(), (app) => appsWithTips.has(app));
      if (decision.watch.app !== watch.app || decision.watch.away !== watch.away || decision.reason) {
        void debug(`sense app=${sense.app} idle=${sense.idleSecs}s away=${decision.watch.away} reason=${decision.reason} muted=${muted}`);
      }
      watch = decision.watch;
      doze(watch.away);
      if (decision.reason && !muted) say(decision.reason);
    },
    say,
    mute(on) {
      muted = on;
    },
  };
}
