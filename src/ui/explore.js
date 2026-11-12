import { litres, nm, bar } from '../data/vehicles.js';

const HOT = [
  ['hood', 'Open the hood', (a) => !a.veh.hoodOpen && !a.flags.xray, (a) => a.toggle('hood', true)],
  ['oil_cap', 'Oil filler cap', 'bay'], ['dipstick', 'Dipstick', 'bay'], ['battery', 'Battery', 'bay'], ['airbox_lid', 'Air filter', 'bay'],
  ['coolant_res', 'Coolant', 'bay'], ['washer_res', 'Washer fluid', 'bay'], ['brake_res', 'Brake fluid', 'bay'], ['belt', 'Drive belt', 'bay'],
  ['wheel_fr', 'Tyre & wheel'], ['head_r', 'Headlamp'], ['oil_filter', 'Oil filter', 'under'], ['drain_plug', 'Drain plug', 'under'], ['muffler', 'Exhaust', 'under'],
];
const bay = (a) => a.veh.hoodOpen || a.flags.xray || a.veh.state.explode > 0.3;
const under = (a) => a.veh.lifted || a.flags.xray || a.veh.state.explode > 0.3;

let query = '';
export const explore = {
  enter(app) {
    query = '';
    app.setHotspots(HOT.map(([part, label, w, fn]) => ({ part, label, when: typeof w === 'function' ? w : w === 'bay' ? bay : w === 'under' ? under : null,
      onClick: () => (fn ? fn(app) : app.select(part)) })));
    this.draw(app);
  },
  leave(app) { if (app.isolated) app.isolate(null); },
  onSelect(id) { this.draw(window.app); },
  draw(app) {
    const veh = app.veh, sel = app.selected && veh.parts.get(app.selected);
    const cats = {};
    for (const p of veh.parts.values()) (cats[p.cat] ||= []).push(p);
    const s = app.def.specs;
    let card = `<div class="card ghost"><p class="muted">Click any part on the car, or pick one from the list. Glowing hotspots give a narrated explanation.</p>
      <div class="row"><button class="btn" data-act="tour-hood">${app.icon('hood')}Look under the hood</button><button class="btn" data-act="tour-under">${app.icon('lift')}Look underneath</button></div></div>`;
    if (sel) {
      const i = app.partInfo(sel);
      card = `<div class="card sel"><div class="eyebrow">${sel.cat}</div><h3>${i.name}</h3><p>${i.text}</p>${i.tip ? `<p class="tip">${app.icon('tool')}${i.tip}</p>` : ''}
        <div class="row wrap"><button class="btn" data-act="focus">${app.icon('target')}Focus</button>
        <button class="btn ${app.isolated ? 'on' : ''}" data-act="isolate">${app.icon('cube')}${app.isolated ? 'Show all' : 'Inspect alone'}</button>
        ${sel.explode.lengthSq() ? `<button class="btn ${veh.isPulled(sel.id) ? 'on' : ''}" data-act="pull">${app.icon('explode')}${veh.isPulled(sel.id) ? 'Refit' : 'Pull out'}</button>` : ''}
        <button class="btn" data-act="say">${app.icon('sound')}Listen</button></div></div>`;
    }
    const list = Object.entries(cats).map(([c, ps]) => {
      const rows = ps.filter((p) => !query || app.partInfo(p).name.toLowerCase().includes(query)).map((p) => `<li class="${p.id === app.selected ? 'on' : ''}" data-act="pick" data-id="${p.id}">${app.partInfo(p).name}</li>`).join('');
      return rows ? `<details ${query || (sel && sel.cat === c) ? 'open' : ''}><summary>${c}<span>${ps.length}</span></summary><ul class="parts">${rows}</ul></details>` : '';
    }).join('');
    const body = app.$('#panelBody');
    const keep = body.querySelector('#partSearch') === document.activeElement;
    app.render(`<h2>Explore</h2>${card}
      <div class="search">${app.icon('search')}<input id="partSearch" data-input="search" placeholder="Search ${veh.parts.size} parts…" value="${query}"></div>
      <div id="partList">${list || '<p class="muted">No parts match.</p>'}</div>
      <details class="sheet"><summary>Service data sheet</summary><dl class="specs col">
        <div><dt>Engine oil</dt><dd>${s.oilQt} qt (${litres(s.oilQt)} L) · ${s.oilType}</dd></div><div><dt>Oil filter</dt><dd>${s.filter}</dd></div>
        <div><dt>Drain plug torque</dt><dd>${s.drainTorque} lb-ft (${nm(s.drainTorque)} N·m)</dd></div><div><dt>Spark plugs</dt><dd>${s.plug} · gap ${s.plugGap} mm · ${s.plugTorque} lb-ft</dd></div>
        <div><dt>Tyres</dt><dd>${s.tire} · F ${s.psiF} / R ${s.psiR} psi (${bar(s.psiF)} bar)</dd></div><div><dt>Wheel nut torque</dt><dd>${s.lugTorque} lb-ft (${nm(s.lugTorque)} N·m)</dd></div>
        <div><dt>Coolant</dt><dd>${s.coolant}</dd></div><div><dt>Battery</dt><dd>${s.battery}</dd></div><div><dt>Wipers</dt><dd>${s.wiperD}" driver · ${s.wiperP}" passenger</dd></div></dl>
        <p class="fine">Typical reference values. Confirm in the owner's manual.</p></details>`);
    if (keep) { const inp = app.$('#partSearch'); inp.focus(); inp.setSelectionRange(query.length, query.length); }
  },
  input(k, el, app) { if (k === 'search') { query = el.value.trim().toLowerCase(); this.draw(app); } },
  on(act, el, app) {
    const id = app.selected, veh = app.veh;
    if (act === 'pick') {
      const pid = el.dataset.id, p = veh.parts.get(pid);
      if (['Engine', 'Ignition', 'Under the hood', 'Electrical', 'Air & fuel', 'Cooling', 'Accessory drive'].includes(p.cat) && !veh.hoodOpen && !app.flags.xray && pid !== 'fuel_tank') veh.setHood(true);
      app.select(pid);
    } else if (act === 'focus') app.focus(id, { k: 4 });
    else if (act === 'isolate') { app.isolate(app.isolated ? null : id); this.draw(app); }
    else if (act === 'pull') { veh.pull(id, !veh.isPulled(id)); this.draw(app); }
    else if (act === 'say') { const i = app.partInfo(veh.parts.get(id)); app.narrator.speak(`${i.name}. ${i.text} ${i.tip || ''}`, true); }
    else if (act === 'tour-hood') { app.run([['lift', 0], ['hood', 1]], 'valve_cover', { yaw: 0.15, pitch: 0.8, abs: 2.6 }); app.narrator.speak('Here is the engine bay. Hotspots mark the items you will check most often: oil, coolant, brake fluid, washer fluid, the battery and the air filter.'); }
    else if (act === 'tour-under') { app.run([['hood', 0], ['lift', 1]], 'oil_pan', { yaw: 0.9, pitch: -0.3, abs: 3.6 }); app.narrator.speak('With the car on the lift you can reach the oil drain plug, the oil filter, the exhaust, and the steering and suspension joints.'); }
  },
};
