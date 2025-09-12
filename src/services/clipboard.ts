import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { strip } from './utils';
import { watch } from 'vue';
import { useSettingsStore } from '@/store';

let timer: number | null = null;
let sentry = '';
let running = false;
let inFlight = false;
let stopWatch: (() => void) | null = null;

const callbacks = new Set<(s: string) => void>();

export function register(cb: (s: string) => void) {
  callbacks.add(cb);
  const settings = useSettingsStore();
  if (!stopWatch)
    stopWatch = watch(
      () => settings.clipboard,
      (v) => {
        if (v) {
          if (running) return;
          running = true;
          schedule();
        } else {
          if (!running) return;
          running = false;
          sentry = '';
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { immediate: true },
    );
  return () => callbacks.delete(cb);
}

function schedule() {
  if (!running) return;
  timer = window.setTimeout(async () => {
    timer = null;
    if (!running || inFlight) {
      schedule();
      return;
    }
    inFlight = true;
    try {
      const raw = await readText();
      const text = strip(raw ?? '').trim();
      if (text === sentry) return;
      if (!sentry) {
        sentry = text;
        return;
      } else {
        sentry = text;
        for (const cb of callbacks) cb(text);
      }
    } catch {
      /**/
    } finally {
      inFlight = false;
      schedule();
    }
  }, 1000);
}
