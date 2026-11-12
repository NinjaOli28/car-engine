import { VEHICLES, MAKES, PAINTS, litres, bar } from '../data/vehicles.js';

/** Landing screen: choose make, model, year and paint. */
export const garage = {
  open(app, first = false) {
    const el = app.$('#garage'); el.hidden = false;
    document.body.classList.add('in-garage');
    let { def, year, paint } = app;
    const draw = () => {
      const models = VEHICLES.filter((v) => v.make === def.make);
      const s = def.specs;
      el.innerHTML = `<div class="garage-card">
        <div class="brand big">${app.icon('logo')}<span>Torque<b>Lab</b></span></div>
        <h1>Know your car,<br>inside and out.</h1>
        <p class="lead">Pick your vehicle, then explore it in 3D, follow guided maintenance projects, and train to pass a full safety inspection.</p>
        <div class="field"><label>Make</label><div class="seg">${MAKES.map((m) => `<button data-make="${m}" class="${m === def.make ? 'on' : ''}">${m}</button>`).join('')}</div></div>
        <div class="field"><label>Model</label><div class="seg">${models.map((m) => `<button data-model="${m.id}" class="${m.id === def.id ? 'on' : ''}">${m.model}</button>`).join('')}</div></div>
        <div class="field two"><div><label for="gYear">Year</label><select id="gYear">${def.years.slice().reverse().map((y) => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
          <div><label>Paint</label><div class="swatches">${PAINTS.map((p) => `<button title="${p.name}" data-paint="${p.id}" class="${p.id === paint.id ? 'on' : ''}" style="--c:#${p.hex.toString(16).padStart(6, '0')}"></button>`).join('')}</div></div></div>
        <dl class="specs"><div><dt>Engine</dt><dd>${def.engine.label}</dd></div><div><dt>Oil</dt><dd>${s.oilQt} qt (${litres(s.oilQt)} L) ${s.oilType.split(' ')[0]}</dd></div><div><dt>Tyres</dt><dd>${s.tire} · ${s.psiF} psi (${bar(s.psiF)} bar)</dd></div></dl>
        <button class="btn primary xl" data-go>Enter the garage ${app.icon('play')}</button>
        <p class="fine">3D models are representative of each body style and engine layout. Service figures are typical reference values. Always confirm against your owner's manual.</p>
      </div>`;
    };
    const apply = () => { app.loadVehicle(def.id, year, paint.id); if (first) app.home(true); app.nav.flyTo({ pitch: 0.2, dist: def.dims.L * 1.55 }); draw(); };
    el.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.make) { def = VEHICLES.find((v) => v.make === b.dataset.make); year = def.years[def.years.length - 1]; apply(); }
      else if (b.dataset.model) { def = VEHICLES.find((v) => v.id === b.dataset.model); year = def.years[def.years.length - 1]; apply(); }
      else if (b.dataset.paint) { paint = PAINTS.find((p) => p.id === b.dataset.paint); apply(); }
      else if ('go' in b.dataset) {
        el.hidden = true; document.body.classList.remove('in-garage'); app.store.set('entered', true);
        app.home();
        const m = app.mode; app.mode = null; app.setMode(m || app.store.get('mode', 'explore'));
        app.narrator.speak(`Welcome to the garage. This is your ${year} ${def.make} ${def.model}. Click any part to learn about it, or start a project.`);
      }
    };
    el.onchange = (e) => { if (e.target.id === 'gYear') { year = +e.target.value; apply(); } };
    app.veh.reset(true); app.setHotspots([]);
    apply();
  },
};
