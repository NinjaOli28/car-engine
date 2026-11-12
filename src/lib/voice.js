// Voice-over using the browser's built-in speech synthesis.
import { store } from './store.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let enabled = store.get('voice', true);
let voice = null;
const listeners = new Set();

function pickVoice() {
  if (!synth) return;
  const vs = synth.getVoices();
  if (!vs.length) return;
  const lang = (navigator.language || 'en-US').slice(0, 2);
  const pref = [/natural/i, /neural/i, /google/i, /samantha|daniel|karen|aria|jenny/i];
  const pool = vs.filter((v) => v.lang.startsWith('en')).concat(vs.filter((v) => v.lang.startsWith(lang)));
  for (const re of pref) { const m = pool.find((v) => re.test(v.name)); if (m) { voice = m; return; } }
  voice = pool[0] || vs[0];
}
if (synth) { pickVoice(); synth.addEventListener?.('voiceschanged', pickVoice); }

function emit(speaking) { listeners.forEach((f) => f(speaking)); }

export const narrator = {
  supported: !!synth,
  get enabled() { return enabled; },
  setEnabled(v) { enabled = v; store.set('voice', v); if (!v) this.stop(); },
  onState(f) { listeners.add(f); },
  /** Speak text. `force` plays even when auto-narration is muted (explicit button press). */
  speak(text, force = false) {
    if (!synth || (!enabled && !force) || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' '));
    if (voice) u.voice = voice;
    u.rate = 1.0; u.pitch = 1.0;
    u.onstart = () => emit(true);
    u.onend = u.onerror = () => emit(false);
    synth.speak(u);
  },
  stop() { synth?.cancel(); emit(false); },
};
