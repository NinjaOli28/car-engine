import { MODULES } from '../data/training.js';

let mod = null, idx = 0, qi = 0, right = 0, answered = null;
const prog = (app) => app.store.get('training', {});

export const training = {
  enter(app) { this.list(app); },
  leave(app) { app.veh.reset(); },
  list(app) {
    mod = null; app.setHotspots([]);
    const pr = prog(app), done = MODULES.filter((m) => pr[m.id] >= 0.66).length;
    app.render(`<h2>Inspector training</h2><p class="muted">Seven short lessons that prepare you for the safety-inspection exam. Each ends with a knowledge check.</p>
      <div class="progress"><div class="bar"><i style="width:${(done / MODULES.length) * 100}%"></i></div><span>${done} of ${MODULES.length} modules passed</span></div>
      <div class="cards">${MODULES.map((m, i) => `<button class="card proj" data-act="open" data-id="${m.id}"><div class="row between"><h3><span class="num">${i + 1}</span>${m.title}</h3>
        ${pr[m.id] !== undefined ? `<span class="pill ${pr[m.id] >= 0.66 ? 'ok' : 'live'}">${Math.round(pr[m.id] * 100)}%</span>` : ''}</div>
        <div class="meta"><span>${app.icon('clock')}${m.mins} min</span><span>${app.icon('book')}${m.slides.length} lessons</span><span>${app.icon('check')}${m.quiz.length} questions</span></div></button>`).join('')}</div>
      <div class="card cta"><h3>${done === MODULES.length ? 'You are ready' : 'Next: put it into practice'}</h3><p>Try a guided practice inspection with the standards shown, then sit the certification exam.</p>
        <button class="btn primary" data-act="practice">${app.icon('shield')}Go to inspection</button></div>`);
  },
  slide(app) {
    const s = mod.slides[idx];
    app.render(`<button class="link" data-act="list">${app.icon('back')}All modules</button><div class="eyebrow">${mod.title} · Lesson ${idx + 1} of ${mod.slides.length}</div>
      <div class="dots">${mod.slides.map((_, i) => `<i class="${i === idx ? 'on' : i < idx ? 'past' : ''}"></i>`).join('')}<i class="q"></i></div>
      <div class="card lesson"><h3>${s.h}</h3><p>${s.text}</p></div>
      <div class="row between"><button class="btn" data-act="prev" ${idx === 0 ? 'disabled' : ''}>${app.icon('back')}Back</button><button class="btn" data-act="say">${app.icon('sound')}Listen</button>
      <button class="btn primary" data-act="next">${idx === mod.slides.length - 1 ? 'Knowledge check' : 'Next'}${app.icon('play')}</button></div>`);
    app.setHotspots([{ part: s.part, label: s.h, cls: 'step' }]);
    app.veh.lampsOff();
    app.run(s.do, s.part, s.view);
    app.narrator.speak(`${s.h}. ${s.text}`);
  },
  quiz(app) {
    const q = mod.quiz[qi];
    app.setHotspots([]);
    app.render(`<button class="link" data-act="list">${app.icon('back')}All modules</button><div class="eyebrow">${mod.title} · Question ${qi + 1} of ${mod.quiz.length}</div>
      <div class="card lesson"><h3>${q.q}</h3><div class="opts">${q.options.map((o, i) => `<button class="opt ${answered !== null ? (i === q.a ? 'right' : i === answered ? 'wrong' : '') : ''}" data-act="answer" data-i="${i}" ${answered !== null ? 'disabled' : ''}>${o}</button>`).join('')}</div>
      ${answered !== null ? `<p class="${answered === q.a ? 'good' : 'bad'}"><b>${answered === q.a ? 'Correct.' : 'Not quite.'}</b> ${q.why}</p>` : ''}</div>
      ${answered !== null ? `<div class="row end"><button class="btn primary" data-act="qnext">${qi === mod.quiz.length - 1 ? 'Finish' : 'Next question'}${app.icon('play')}</button></div>` : ''}`);
  },
  result(app) {
    const score = right / mod.quiz.length, pr = prog(app);
    pr[mod.id] = Math.max(pr[mod.id] ?? 0, score); app.store.set('training', pr);
    const pass = score >= 0.66, i = MODULES.indexOf(mod), nxt = MODULES[i + 1];
    app.veh.reset(); app.home();
    app.render(`<button class="link" data-act="list">${app.icon('back')}All modules</button>
      <div class="card done ${pass ? '' : 'retry'}">${app.icon(pass ? 'award' : 'refresh')}<div><h3>${pass ? 'Module passed' : 'Have another go'}</h3><p>You answered ${right} of ${mod.quiz.length} correctly.</p></div></div>
      <div class="row">${pass && nxt ? `<button class="btn primary" data-act="open" data-id="${nxt.id}">Next: ${nxt.title}${app.icon('play')}</button>` : pass ? `<button class="btn primary" data-act="practice">${app.icon('shield')}Go to inspection</button>` : `<button class="btn primary" data-act="open" data-id="${mod.id}">${app.icon('refresh')}Review module</button>`}</div>`);
    app.narrator.speak(pass ? 'Module passed.' : 'Review the lesson and try again.');
  },
  on(act, el, app) {
    if (act === 'open') { mod = MODULES.find((m) => m.id === el.dataset.id); idx = 0; this.slide(app); }
    else if (act === 'list') { app.runId++; app.narrator.stop(); app.veh.reset(); app.home(); this.list(app); }
    else if (act === 'prev') { idx--; this.slide(app); }
    else if (act === 'next') { if (idx < mod.slides.length - 1) { idx++; this.slide(app); } else { qi = 0; right = 0; answered = null; app.narrator.stop(); this.quiz(app); } }
    else if (act === 'say') { const s = mod.slides[idx]; app.narrator.speak(`${s.h}. ${s.text}`, true); }
    else if (act === 'answer') { answered = +el.dataset.i; const q = mod.quiz[qi]; if (answered === q.a) right++; this.quiz(app); app.narrator.speak(`${answered === q.a ? 'Correct.' : 'Not quite.'} ${q.why}`); }
    else if (act === 'qnext') { answered = null; if (qi < mod.quiz.length - 1) { qi++; this.quiz(app); } else this.result(app); }
    else if (act === 'practice') app.setMode('inspection');
  },
};
