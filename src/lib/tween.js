// Minimal tween engine driven by the render loop.
const active = new Set();
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  linear: (t) => t,
  back: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
};

export function tween({ from = 0, to = 1, dur = 0.7, delay = 0, easing = ease.inOut, onUpdate, key }) {
  if (key) for (const t of active) if (t.key === key) { active.delete(t); t.resolve(false); }
  return new Promise((resolve) => {
    const t = { from, to, dur, delay, easing, onUpdate, key, time: 0, resolve };
    if (dur <= 0) { onUpdate?.(to); resolve(true); return; }
    active.add(t);
  });
}

export function updateTweens(dt) {
  for (const t of active) {
    if (t.delay > 0) { t.delay -= dt; continue; }
    t.time += dt;
    const k = Math.min(1, t.time / t.dur);
    t.onUpdate?.(t.from + (t.to - t.from) * t.easing(k));
    if (k >= 1) { active.delete(t); t.resolve(true); }
  }
}

export const wait = (s) => tween({ dur: s });
