import { ITEMS, AREAS, GRADES, GRADE_HELP, VERDICTS, makeScenario, assess } from '../data/inspection.js';
import { MODULES } from '../data/training.js';
import { bar } from '../data/vehicles.js';
import { tween, ease } from '../lib/tween.js';

let sess = null, timer = null;
const G = ['pass', 'minor', 'major', 'danger'];
const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const item = (id) => ITEMS.find((i) => i.id === id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const inspection = {
  enter(app) { sess ? this.list(app) : this.intro(app); },
  leave(app) { clearInterval(timer); app.veh.reset(); },

  intro(app) {
    app.setHotspots([]);
    const pr = app.store.get('training', {}), trained = MODULES.filter((m) => pr[m.id] >= 0.66).length;
    const hist = app.store.get('insp.history', []), best = hist.filter((h) => h.mode === 'exam').reduce((m, h) => Math.max(m, h.score), 0);
    app.render(`<h2>Safety inspection</h2>
      <p>Carry out a full ${ITEMS.length}-point roadworthiness inspection on this ${app.def.make} ${app.def.model}. Each vehicle arrives in a different condition. Measure, observe, grade every item, then give your verdict.</p>
      <div class="card"><h4>Grading standard</h4><ul class="grades">${GRADES.map((g, i) => `<li><span class="g ${G[i]}">${g}</span>${GRADE_HELP[i].replace(/^\w+: /, '')}</li>`).join('')}</ul>
        <p class="fine">Defect categories follow EU Directive 2014/45/EU on periodic roadworthiness tests. Thresholds reflect common international practice (CITA, UK MOT, US state inspections). Local law varies, so treat this as training, not a legal reference.</p></div>
      <button class="card proj" data-act="start" data-mode="practice"><div class="row between"><h3>Practice inspection</h3><span class="pill live">Guided</span></div><p>The standard is shown for every item and you get feedback after each grade.</p></button>
      <button class="card proj" data-act="start" data-mode="exam"><div class="row between"><h3>Certification exam</h3><span class="pill">${best ? 'Best ' + best + '%' : 'Scored'}</span></div><p>No hints. Score 80% or more without missing a major or dangerous defect to earn your certificate.</p>
        ${trained < MODULES.length ? `<p class="warn">${app.icon('warn')}You have passed ${trained} of ${MODULES.length} training modules. Training is recommended first.</p>` : ''}</button>
      <button class="link" data-act="training">${app.icon('book')}Open inspector training</button>`);
  },

  start(app, mode) {
    const scn = makeScenario(app.def);
    sess = { mode, scn, answers: {}, checked: {}, t0: Date.now(), cur: null };
    for (const id of ['washer', 'brakefluid', 'coolant']) scn.findings[id].apply?.(app.veh);
    app.narrator.speak(mode === 'exam' ? 'Certification exam started. Inspect every item, then give your verdict in the final review.' : 'Practice inspection started. Choose an item from the checklist, or click a hotspot on the vehicle.');
    app.home(); this.list(app);
  },

  hotspots(app) {
    const seen = new Set(), hs = [];
    for (const it of ITEMS) { if (sess.answers[it.id] !== undefined || seen.has(it.part)) continue; seen.add(it.part); hs.push({ part: it.part, label: it.name, cls: 'insp', onClick: () => this.open(app, it.id) }); }
    app.setHotspots(hs);
  },

  list(app) {
    sess.cur = null;
    const n = Object.keys(sess.answers).length, s = app.def.specs;
    app.render(`<div class="row between"><h2>${sess.mode === 'exam' ? 'Certification exam' : 'Practice inspection'}</h2><span class="timer">${app.icon('clock')}<b id="timer">${fmt(Date.now() - sess.t0)}</b></span></div>
      <div class="progress"><div class="bar"><i style="width:${(n / ITEMS.length) * 100}%"></i></div><span>${n} of ${ITEMS.length} items graded</span></div>
      <div class="card placard"><h4>Vehicle data</h4><dl class="specs"><div><dt>Tyres</dt><dd>${s.tire}</dd></div><div><dt>Front</dt><dd>${s.psiF} psi / ${bar(s.psiF)} bar</dd></div><div><dt>Rear</dt><dd>${s.psiR} psi / ${bar(s.psiR)} bar</dd></div></dl></div>
      ${AREAS.map((a) => { const its = ITEMS.filter((i) => i.area === a), d = its.filter((i) => sess.answers[i.id] !== undefined).length;
        return `<details open><summary>${a}<span>${d}/${its.length}</span></summary><ul class="checks">${its.map((i) => { const g = sess.answers[i.id];
          return `<li data-act="item" data-id="${i.id}"><span class="state ${g !== undefined ? G[g] : ''}">${g !== undefined ? app.icon('check') : ''}</span><span>${i.name}</span>${g !== undefined ? `<em class="g ${G[g]}">${GRADES[g]}</em>` : ''}</li>`; }).join('')}</ul></details>`; }).join('')}
      <div class="sticky-foot"><button class="btn primary xl" data-act="review">${app.icon('shield')}Final review & verdict</button><button class="link" data-act="abandon">Abandon inspection</button></div>`);
    clearInterval(timer); timer = setInterval(() => { const t = app.$('#timer'); if (t && sess) t.textContent = fmt(Date.now() - sess.t0); }, 1000);
    this.hotspots(app);
  },

  open(app, id) {
    const it = item(id), veh = app.veh;
    sess.cur = id; veh.lampsOff();
    const prep = it.prep || [], pulled = prep.filter((a) => a[0] === 'pull').map((a) => a[1]);
    for (const p of veh.parts.values()) if (p.pullGoal === 1 && !pulled.includes(p.id)) veh.pull(p.id, false, 0.6);
    app.run([['hood', prep.some((a) => a[0] === 'hood') ? 1 : 0], ['lift', prep.some((a) => a[0] === 'lift') ? 1 : 0], ...pulled.map((p) => ['pull', p, 1])], it.part, it.view);
    app.setHotspots([{ part: it.part, label: it.name, cls: 'insp' }]);
    app.narrator.speak(`${it.name}. ${it.how}`);
    this.item(app);
  },

  item(app) {
    const it = item(sess.cur), f = sess.scn.findings[it.id], done = sess.checked[it.id], g = sess.answers[it.id];
    const idx = ITEMS.indexOf(it), practice = sess.mode === 'practice';
    const label = it.operate || (it.gauge ? `Measure with ${it.tool.toLowerCase()}` : 'Inspect');
    app.render(`<button class="link" data-act="back">${app.icon('back')}Checklist</button>
      <div class="eyebrow">${it.area} · Item ${idx + 1} of ${ITEMS.length}</div><h2>${it.name}</h2>
      <div class="card"><h4>Method</h4><p>${it.how}</p><p class="ref">${app.icon('book')}${it.ref(app.def)}</p>
        ${practice ? `<p class="std">${app.icon('gauge')}<span><b>Standard:</b> ${it.std}</span></p>` : ''}</div>
      ${done ? `<div class="card reading"><h4>Finding</h4>${it.gauge ? `<div class="gaugebox"><span id="gval">${f.value}</span><small>${f.unit}</small></div>` : ''}<p>${f.reading}</p></div>`
        : `<button class="btn primary xl" data-act="perform">${app.icon(it.gauge ? 'gauge' : 'eye')}${label}</button>`}
      <h4>Your grade</h4><div class="gradebtns ${done ? '' : 'locked'}">${GRADES.map((n, i) => `<button class="gb ${G[i]} ${g === i ? 'on' : ''}" data-act="grade" data-g="${i}" title="${GRADE_HELP[i]}" ${done ? '' : 'disabled'}>${n}</button>`).join('')}</div>
      ${!done ? `<p class="fine">${app.icon('lock')}Carry out the check before grading.</p>` : ''}
      ${practice && g !== undefined ? `<div class="card fb ${g === f.truth ? 'good' : 'bad'}"><b>${g === f.truth ? 'Correct.' : `The right grade is ${GRADES[f.truth]}.`}</b> ${f.why} <span class="fine">${it.std}</span></div>` : ''}
      <div class="row between"><button class="btn" data-act="prevItem" ${idx === 0 ? 'disabled' : ''}>${app.icon('back')}Previous</button>
        <button class="btn ${g !== undefined ? 'primary' : ''}" data-act="nextItem">${idx === ITEMS.length - 1 ? 'Checklist' : 'Next item'}${app.icon('play')}</button></div>`);
  },

  async perform(app) {
    const it = item(sess.cur), f = sess.scn.findings[it.id], id = it.id;
    sess.checked[id] = true;
    if (it.act) for (const a of it.act) { if (sess?.cur !== id) return; await app.act(a); }
    if (sess?.cur !== id) return;
    f.apply?.(app.veh);
    this.item(app);
    if (it.gauge) { const el = app.$('#gval'); tween({ from: 0, to: f.value, dur: 0.9, easing: ease.out, onUpdate: (v) => { if (el.isConnected) el.textContent = it.gauge === 'psi' ? Math.round(v) : v.toFixed(1); } }); }
    app.narrator.speak(f.reading);
  },

  review(app) {
    const n = Object.keys(sess.answers).length, left = ITEMS.length - n;
    const counts = [0, 0, 0, 0]; Object.values(sess.answers).forEach((g) => counts[g]++);
    const defects = ITEMS.filter((i) => sess.answers[i.id] > 0);
    app.modal(`<h2>Final review</h2><p class="muted">Review your findings, then give the overall verdict for this vehicle.</p>
      <div class="tally">${GRADES.map((g, i) => `<div class="${G[i]}"><b>${counts[i]}</b><span>${g}</span></div>`).join('')}<div class="${left ? 'warnbox' : ''}"><b>${left}</b><span>Not inspected</span></div></div>
      ${left ? `<p class="warn">${app.icon('warn')}${left} item${left > 1 ? 's have' : ' has'} not been inspected. A certificate should not be issued on an incomplete inspection.</p>` : ''}
      ${defects.length ? `<h4>Defects you recorded</h4><ul class="deflist">${defects.map((i) => `<li><em class="g ${G[sess.answers[i.id]]}">${GRADES[sess.answers[i.id]]}</em>${i.name}</li>`).join('')}</ul>` : '<p>You recorded no defects.</p>'}
      <h4>Your verdict</h4><div class="verdicts">${VERDICTS.map((v) => `<label><input type="radio" name="verdict" value="${v.id}"><span><b>${v.label}</b><small>${v.help}</small></span></label>`).join('')}</div>
      <div class="field two"><div><label for="inspName">Inspector name</label><input id="inspName" placeholder="Your name" value="${esc(app.store.get('inspector', ''))}" maxlength="60"></div></div>
      <label for="inspNotes">Assessment notes (optional)</label><textarea id="inspNotes" rows="2" placeholder="Summary of the vehicle's condition and any advice to the owner"></textarea>
      <div class="row end"><button class="btn" data-act="closeModal">Keep inspecting</button><button class="btn primary" data-act="submit">${app.icon('check')}Submit assessment</button></div>`, 'sticky wide');
  },

  submit(app) {
    const v = app.$('input[name=verdict]:checked')?.value;
    if (!v) { app.toast('Choose a verdict first', 'bad'); return; }
    const name = app.$('#inspName').value.trim() || 'Inspector', notes = app.$('#inspNotes').value.trim();
    app.store.set('inspector', name);
    const r = assess(sess.scn, sess.answers, v), exam = sess.mode === 'exam', time = Date.now() - sess.t0;
    const hist = app.store.get('insp.history', []); hist.push({ date: Date.now(), mode: sess.mode, score: r.score, passed: r.passed, vehicle: app.def.id }); app.store.set('insp.history', hist.slice(-30));
    const car = `${app.year} ${app.def.make} ${app.def.model}`, date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const vl = (id) => VERDICTS.find((x) => x.id === id).label;
    const certId = `TL-${sess.scn.seed.toString(36).toUpperCase().slice(-6)}-${r.score}`;
    const C = 2 * Math.PI * 52;
    const cert = exam && r.passed ? `<div class="cert"><div class="cert-in">${app.icon('award')}<small>Certificate of Competence</small><h3>Vehicle Safety Inspector</h3><p>This certifies that</p><h2>${esc(name)}</h2>
        <p>completed a ${ITEMS.length}-point simulated roadworthiness inspection of a ${car} with a score of <b>${r.score}%</b> (${r.band}) and reached the correct verdict:</p><p class="vv">${vl(sess.scn.verdict)}</p>
        <div class="cert-foot"><span>${date}</span><span>${certId}</span><span>TorqueLab simulator · training only</span></div></div></div>` : '';
    const status = { correct: ['✓', 'good'], close: ['≈', 'mid'], under: ['Under-graded', 'bad'], over: ['Over-graded', 'mid'], missed: ['Not inspected', 'bad'] };
    app.modal(`<div class="result-head"><svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle class="v ${r.passed ? 'ok' : r.score >= 65 ? 'mid' : 'bad'}" cx="60" cy="60" r="52" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - r.score / 100)}"/><text x="60" y="58">${r.score}</text><text class="s" x="60" y="78">out of 100</text></svg>
        <div><div class="eyebrow">${exam ? 'Certification exam' : 'Practice inspection'} · ${car} · ${fmt(time)}</div><h2>${r.band}</h2>
        <p>${r.unsafeCert ? 'You certified a vehicle that should have failed. This is the most serious error an inspector can make.' : r.missedCritical ? `You missed ${r.missedCritical} major or dangerous defect${r.missedCritical > 1 ? 's' : ''}, which caps the result.` : r.passed ? 'A thorough, accurate inspection.' : 'Review the items below and try again.'}</p>
        <div class="kpis"><div><b>${Math.round(r.accuracy * 100)}%</b><span>Grading accuracy</span></div><div><b>${r.inspected}/${r.total}</b><span>Items inspected</span></div><div><b>${r.missedCritical}</b><span>Serious defects missed</span></div><div><b>${r.falseFails}</b><span>False fails</span></div></div></div></div>
      <div class="verdict-cmp ${r.verdictOk ? 'good' : 'bad'}"><div><span>Your verdict</span><b>${vl(v)}</b></div><div><span>Correct verdict</span><b>${vl(sess.scn.verdict)}</b></div></div>
      ${notes ? `<p class="notes"><b>Your notes:</b> ${esc(notes)}</p>` : ''}${cert}
      <h4>Item-by-item review</h4><div class="tablewrap"><table class="review"><thead><tr><th>Item</th><th>You</th><th>Actual</th><th>Result</th></tr></thead><tbody>
        ${r.rows.map((x) => `<tr class="${status[x.status][1]}"><td><b>${x.item.name}</b><small>${x.reading} ${x.status !== 'correct' ? x.item.std : ''}</small></td><td>${x.answer !== undefined ? `<em class="g ${G[x.answer]}">${GRADES[x.answer]}</em>` : '—'}</td><td><em class="g ${G[x.truth]}">${GRADES[x.truth]}</em></td><td class="st">${status[x.status][0]}</td></tr>`).join('')}</tbody></table></div>
      <div class="row end noprint">${cert ? `<button class="btn" data-act="print">${app.icon('print')}Print certificate</button>` : ''}<button class="btn" data-act="training">${app.icon('book')}Training</button><button class="btn primary" data-act="again">${app.icon('refresh')}New inspection</button></div>`, 'sticky wide result');
    app.narrator.speak(`Your score is ${r.score} percent. ${r.band}. ${r.verdictOk ? 'Your verdict was correct.' : 'The correct verdict was: ' + vl(sess.scn.verdict)}`);
    clearInterval(timer); sess = null;
    ['coolant', 'washer', 'brake'].forEach((k) => app.veh.setFluid(k, 0.8));
    app.veh.reset(); app.home(); this.intro(app);
  },

  on(act, el, app) {
    if (act === 'start') this.start(app, el.dataset.mode);
    else if (act === 'training') { app.closeModal(); app.setMode('training'); }
    else if (act === 'item') this.open(app, el.dataset.id);
    else if (act === 'back') { app.veh.lampsOff(); this.list(app); }
    else if (act === 'perform') this.perform(app);
    else if (act === 'grade') { sess.answers[sess.cur] = +el.dataset.g; this.item(app); if (sess.mode === 'practice') { const f = sess.scn.findings[sess.cur]; app.narrator.speak(`${+el.dataset.g === f.truth ? 'Correct.' : 'The right grade is ' + GRADES[f.truth] + '.'} ${f.why}`); } }
    else if (act === 'nextItem' || act === 'prevItem') { const i = ITEMS.findIndex((x) => x.id === sess.cur) + (act === 'nextItem' ? 1 : -1); if (ITEMS[i]) this.open(app, ITEMS[i].id); else { app.veh.lampsOff(); app.setState({}); app.home(); this.list(app); } }
    else if (act === 'review') this.review(app);
    else if (act === 'closeModal') app.closeModal();
    else if (act === 'submit') this.submit(app);
    else if (act === 'print') { try { window.print(); } catch { app.toast('Printing is not available here'); } }
    else if (act === 'again') { app.closeModal(); this.intro(app); }
    else if (act === 'abandon') app.modal(`<h2>Abandon this inspection?</h2><p class="muted">Your grades so far will be lost.</p><div class="row end"><button class="btn" data-act="closeModal">Keep inspecting</button><button class="btn primary" data-act="abandonYes">Abandon</button></div>`);
    else if (act === 'abandonYes') { app.closeModal(); clearInterval(timer); sess = null; app.veh.reset(); ['coolant', 'washer', 'brake'].forEach((k) => app.veh.setFluid(k, 0.8)); app.home(); this.intro(app); }
  },
};
