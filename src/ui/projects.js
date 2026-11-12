import { PROJECTS, fill } from '../data/projects.js';

let cur = null, step = 0;
const key = (app, id) => `proj.${app.def.id}.${id}`;
const load = (app, id) => app.store.get(key(app, id), null);
const save = (app, id, st) => app.store.set(key(app, id), st);

export const projects = {
  enter(app) { cur = null; this.list(app); },
  leave(app) { app.veh.reset(); },
  list(app) {
    cur = null; app.setHotspots([]);
    app.render(`<h2>Projects</h2><p class="muted">Step-by-step jobs for your ${app.def.make} ${app.def.model}. Starting a project creates a checklist that saves your progress.</p>
      <div class="cards">${PROJECTS.map((p) => {
        const st = load(app, p.id), done = st ? st.done.filter(Boolean).length : 0, pct = Math.round((done / p.steps.length) * 100);
        return `<button class="card proj" data-act="open" data-id="${p.id}"><div class="row between"><h3>${p.title}</h3>${st ? `<span class="pill ${pct === 100 ? 'ok' : 'live'}">${pct === 100 ? 'Complete' : pct + '%'}</span>` : ''}</div>
          <p>${fill(p.blurb, app.def)}</p><div class="meta"><span>${app.icon('gauge')}${p.level}</span><span>${app.icon('clock')}${p.mins} min</span><span>${app.icon('check')}${p.steps.length} steps</span></div>
          ${st ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</button>`;
      }).join('')}</div>`);
  },
  open(app, id) {
    const p = PROJECTS.find((x) => x.id === id), st = load(app, id), v = app.def;
    cur = p;
    if (st) return this.checklist(app);
    app.render(`<button class="link" data-act="list">${app.icon('back')}All projects</button><h2>${p.title}</h2><p>${fill(p.blurb, v)}</p>
      <div class="meta"><span>${app.icon('gauge')}${p.level}</span><span>${app.icon('clock')}${p.mins} min</span></div>
      ${p.tools.length ? `<h4>Tools</h4><ul class="ticks">${p.tools.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
      ${p.supplies.length ? `<h4>Parts & supplies for this vehicle</h4><ul class="ticks">${p.supplies.map((t) => `<li>${fill(t, v)}</li>`).join('')}</ul>` : ''}
      <h4>What you will do</h4><ol class="outline">${p.steps.map((s) => `<li>${s.t}</li>`).join('')}</ol>
      <button class="btn primary xl" data-act="start">${app.icon('play')}Start project</button>`);
  },
  checklist(app, go = true) {
    const p = cur, v = app.def, st = load(app, p.id);
    const done = st.done.filter(Boolean).length, pct = Math.round((done / p.steps.length) * 100);
    step = Math.min(step, p.steps.length - 1);
    app.render(`<button class="link" data-act="list">${app.icon('back')}All projects</button>
      <div class="row between"><h2>${p.title}</h2><button class="iconbtn" title="Restart project" data-act="restart">${app.icon('refresh')}</button></div>
      <div class="progress"><div class="bar"><i style="width:${pct}%"></i></div><span>${done} of ${p.steps.length} complete</span></div>
      ${pct === 100 ? `<div class="card done">${app.icon('award')}<div><h3>Project complete</h3><p>Nice work. Every step is checked off.</p></div></div>` : ''}
      <ol class="steps">${p.steps.map((s, i) => `<li class="${i === step ? 'cur' : ''} ${st.done[i] ? 'done' : ''}">
        <div class="step-head" data-act="goto" data-i="${i}"><button class="check" data-act="tick" data-i="${i}" aria-label="Mark step ${i + 1} complete">${st.done[i] ? app.icon('check') : i + 1}</button><span>${s.t}</span></div>
        ${i === step ? `<div class="step-body"><p>${fill(s.d, v)}</p>${s.warn ? `<p class="warn">${app.icon('warn')}${fill(s.warn, v)}</p>` : ''}
          <div class="row"><button class="btn" data-act="show">${app.icon('play')}Show me</button><button class="btn" data-act="say">${app.icon('sound')}Listen</button>
          <button class="btn primary" data-act="complete">${st.done[i] ? 'Next step' : 'Mark complete'}${app.icon('check')}</button></div></div>` : ''}</li>`).join('')}</ol>`);
    app.$('.steps li.cur')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const s = p.steps[step];
    app.setHotspots([{ part: s.part, label: s.t, n: step + 1, cls: 'step' }]);
    if (go) this.show(app, true);
  },
  show(app, speak) {
    const s = cur.steps[step];
    app.run(s.do, s.part, s.view);
    if (speak) app.narrator.speak(`Step ${step + 1}. ${s.t}. ${fill(s.d, app.def)} ${s.warn ? 'Caution. ' + fill(s.warn, app.def) : ''}`);
  },
  on(act, el, app, e) {
    if (act === 'open') this.open(app, el.dataset.id);
    else if (act === 'list') { app.runId++; app.narrator.stop(); app.veh.reset(); app.home(); this.list(app); }
    else if (act === 'start') { save(app, cur.id, { done: cur.steps.map(() => false), started: Date.now() }); step = 0; this.checklist(app); }
    else if (act === 'restart') { save(app, cur.id, { done: cur.steps.map(() => false), started: Date.now() }); step = 0; app.veh.reset(); this.checklist(app); }
    else if (act === 'goto') { step = +el.dataset.i; this.checklist(app); }
    else if (act === 'tick') { e.stopPropagation(); const st = load(app, cur.id), i = +el.dataset.i; st.done[i] = !st.done[i]; save(app, cur.id, st); this.checklist(app, false); }
    else if (act === 'show') this.show(app, false);
    else if (act === 'say') { const s = cur.steps[step]; app.narrator.speak(`${s.t}. ${fill(s.d, app.def)} ${s.warn ? 'Caution. ' + fill(s.warn, app.def) : ''}`, true); }
    else if (act === 'complete') {
      const st = load(app, cur.id); st.done[step] = true; save(app, cur.id, st);
      const next = st.done.findIndex((d, i) => !d && i > step), any = st.done.findIndex((d) => !d);
      if (next >= 0) { step = next; this.checklist(app); }
      else if (any >= 0) { step = any; this.checklist(app); }
      else { this.checklist(app, false); app.veh.reset(); app.home(); app.toast('Project complete', 'ok'); app.narrator.speak('Project complete. Well done.'); }
    }
  },
};
