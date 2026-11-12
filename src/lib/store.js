const KEY = 'torquelab.v1';
let cache;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { cache = {}; }
  return cache;
}
export const store = {
  get(k, d) { const v = load()[k]; return v === undefined ? d : v; },
  set(k, v) { load()[k] = v; try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode */ } },
};
