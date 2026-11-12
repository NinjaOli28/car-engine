// Safety-inspection simulator: items, randomised vehicle condition and assessment.
// The grading rubric follows the defect categories used for periodic roadworthiness
// tests under EU Directive 2014/45/EU (minor / major / dangerous), with thresholds
// drawn from common international practice (CITA recommendations, UK MOT, US DOT).
// Legal limits differ between jurisdictions — this is a training rubric, not law.

export const GRADES = ['Pass', 'Minor', 'Major', 'Dangerous'];
export const GRADE_HELP = [
  'Meets the standard. No action needed.',
  'Minor: no significant effect on safety. Record as an advisory; the vehicle still passes.',
  'Major: may compromise safety or the environment. The vehicle fails until repaired.',
  'Dangerous: a direct and immediate risk. The vehicle fails and must not be driven.',
];
export const VERDICTS = [
  { id: 'pass', label: 'Pass — certify roadworthy', help: 'No defects found.' },
  { id: 'advisory', label: 'Pass with advisories', help: 'Minor defects only. Certificate issued with advisories.' },
  { id: 'fail', label: 'Fail — refuse certificate', help: 'One or more major defects. Repair and re-test.' },
  { id: 'dangerous', label: 'Fail — dangerous, prohibit use', help: 'One or more dangerous defects. Must not be driven.' },
];
export const verdictFor = (maxGrade) => VERDICTS[maxGrade].id;

export const AREAS = ['Tyres & wheels', 'Brakes', 'Lights & signals', 'Visibility', 'Under the hood', 'Under the vehicle', 'Cabin & controls'];

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const between = (r, a, b) => a + (b - a) * r();
function pick(r, opts) { const tot = opts.reduce((s, o) => s + o.w, 0); let x = r() * tot; for (const o of opts) { x -= o.w; if (x <= 0) return o; } return opts[opts.length - 1]; }

const WHEELS = [['fl', 'Front left'], ['fr', 'Front right'], ['rl', 'Rear left'], ['rr', 'Rear right']];
const wheelView = (tag) => ({ yaw: { fl: -1.25, fr: 1.25, rl: -1.9, rr: 1.9 }[tag], pitch: 0.1, k: 3.6 });
const PW = 0.8; // weight of a healthy outcome

/** A visual/functional check built from weighted outcomes. */
const visual = (o, outcomes) => ({ ...o, gen: (r) => { const c = pick(r, outcomes); return { reading: c.r, truth: c.g, why: c.why || c.r, apply: c.apply }; } });

export const ITEMS = [
  ...WHEELS.map(([tag, label]) => ({
    id: `psi_${tag}`, area: 'Tyres & wheels', name: `${label} tyre pressure`, part: `wheel_${tag}`, view: wheelView(tag), tool: 'Pressure gauge', gauge: 'psi',
    how: 'Remove the valve cap, press the gauge squarely onto the valve and read the cold pressure.',
    ref: (v) => `Door-jamb placard: ${tag[0] === 'f' ? v.specs.psiF : v.specs.psiR} psi cold`,
    std: 'Within ±10% of placard: pass. 10–25% out: minor. More than 25% out: major. Below half the placard pressure: dangerous.',
    gen: (r, v) => {
      const spec = tag[0] === 'f' ? v.specs.psiF : v.specs.psiR;
      const c = pick(r, [{ w: PW, a: 0.95, b: 1.05, g: 0 }, { w: 0.08, a: 0.8, b: 0.87, g: 1 }, { w: 0.07, a: 0.58, b: 0.72, g: 2 }, { w: 0.02, a: 1.3, b: 1.38, g: 2 }, { w: 0.03, a: 0.28, b: 0.42, g: 3 }]);
      const val = Math.round(spec * between(r, c.a, c.b)), pct = Math.round((val / spec - 1) * 100);
      return { value: val, unit: 'psi', reading: `Gauge reads ${val} psi.`, truth: c.g, why: `${val} psi against a ${spec} psi placard is ${pct === 0 ? 'on target' : `${Math.abs(pct)}% ${pct < 0 ? 'under' : 'over'}`}.` };
    } })),
  ...WHEELS.map(([tag, label]) => ({
    id: `tread_${tag}`, area: 'Tyres & wheels', name: `${label} tyre tread & condition`, part: `wheel_${tag}`, view: wheelView(tag), tool: 'Tread depth gauge', gauge: 'mm',
    how: 'Measure the main grooves at the inner edge, centre and outer edge. Record the lowest reading and look over both sidewalls.',
    ref: () => 'Legal minimum tread: 1.6 mm across the central three-quarters',
    std: '3.0 mm or more: pass. 1.6–2.9 mm: minor (advise replacement). Below 1.6 mm: major. Cords exposed or sidewall bulge: dangerous.',
    gen: (r) => {
      const c = pick(r, [{ w: PW, a: 4, b: 7.5, g: 0 }, { w: 0.09, a: 1.8, b: 2.8, g: 1 }, { w: 0.07, a: 0.9, b: 1.4, g: 2 }, { w: 0.02, a: 0.1, b: 0.5, g: 3, cords: 1 }, { w: 0.02, a: 4, b: 6, g: 3, bulge: 1 }]);
      const val = Math.round(between(r, c.a, c.b) * 10) / 10;
      const extra = c.cords ? ' Steel cords are showing on the inner shoulder.' : c.bulge ? ' There is a bulge the size of an egg on the outer sidewall.' : ' Sidewalls are sound.';
      return { value: val, unit: 'mm', reading: `Lowest groove depth ${val.toFixed(1)} mm.${extra}`, truth: c.g,
        why: c.cords ? 'Exposed cords mean the tyre structure is failing.' : c.bulge ? 'A sidewall bulge means the carcass has failed and the tyre can burst, whatever the tread depth.' : `${val.toFixed(1)} mm ${val >= 3 ? 'is comfortably above the limit' : val >= 1.6 ? 'is legal but close to the 1.6 mm limit' : 'is below the 1.6 mm legal minimum'}.` };
    } })),
  ...[['f', 'Front', 'fl', -1.2], ['r', 'Rear', 'rr', 1.95]].map(([ax, label, tag, yaw]) => ({
    id: `pads_${ax}`, area: 'Brakes', name: `${label} brake pads & discs`, part: `pads_${tag}`, view: { yaw, pitch: 0.12, k: 5 }, tool: 'Pad gauge', gauge: 'mm', prep: [['lift', 1], ['pull', `lugs_${tag}`, 1], ['pull', `wheel_${tag}`, 1]],
    how: 'With the wheel removed, measure the friction material on the thinnest pad and examine the disc faces.',
    ref: () => 'New pads: about 10–12 mm of friction material',
    std: '4 mm or more: pass. 3.0–3.9 mm: minor. 1.5–2.9 mm: major. Under 1.5 mm or metal-to-metal: dangerous.',
    gen: (r) => {
      const c = pick(r, [{ w: PW, a: 5, b: 10, g: 0 }, { w: 0.09, a: 3.1, b: 3.8, g: 1 }, { w: 0.08, a: 1.7, b: 2.7, g: 2 }, { w: 0.03, a: 0, b: 0.8, g: 3 }]);
      const val = Math.round(between(r, c.a, c.b) * 10) / 10;
      return { value: val, unit: 'mm', reading: `Thinnest pad measures ${val.toFixed(1)} mm.${c.g === 3 ? ' The backing plate has been grinding the disc, which is deeply scored.' : ' Disc faces are smooth.'}`, truth: c.g,
        why: c.g === 3 ? 'Metal-to-metal contact: braking is severely reduced.' : `${val.toFixed(1)} mm of friction material remaining.` };
    } })),

  visual({ id: 'headlamps', area: 'Lights & signals', name: 'Headlamps (low beam)', part: 'head_l', view: { yaw: 0, pitch: 0.12, k: 0.55, abs: 6 }, operate: 'Switch on low beam',
    how: 'Switch on the low beams and look at both lamps from the front.', ref: () => 'Both lamps must light, white, at equal brightness', std: 'One lamp out: major. Both out: dangerous.' }, [
    { w: PW, g: 0, r: 'Both headlamps light with a steady white beam.', apply: (c) => { c.setLamp('head_l', 1); c.setLamp('head_r', 1); } },
    { w: 0.12, g: 2, r: 'The right-hand lamp lights. The left-hand lamp stays dark.', why: 'One headlamp inoperative.', apply: (c) => c.setLamp('head_r', 1) },
    { w: 0.03, g: 3, r: 'Neither headlamp lights.', why: 'No dipped-beam lighting at all.', apply: () => {} }]),
  visual({ id: 'indicators', area: 'Lights & signals', name: 'Direction indicators', part: 'ind_fl', view: { yaw: 0.5, pitch: 0.2, k: 0.5, abs: 7 }, operate: 'Switch on hazard lights',
    how: 'Switch on the hazard lights and walk around the vehicle. All four corners should flash amber.', ref: () => 'All indicators amber, 60–120 flashes per minute', std: 'Any indicator not working: major.' }, [
    { w: PW, g: 0, r: 'All four indicators flash amber at a steady rate.', apply: (c) => ['ind_fl', 'ind_fr', 'ind_rl', 'ind_rr'].forEach((i) => c.blink(i)) },
    { w: 0.12, g: 2, r: 'Three indicators flash rapidly. The rear right does not light.', why: 'Rear-right indicator inoperative (the fast flash rate is the tell-tale).', apply: (c) => ['ind_fl', 'ind_fr', 'ind_rl'].forEach((i) => c.blink(i, 0.22)) },
    { w: 0.08, g: 2, r: 'The front left indicator does not light. The others flash rapidly.', why: 'Front-left indicator inoperative.', apply: (c) => ['ind_fr', 'ind_rl', 'ind_rr'].forEach((i) => c.blink(i, 0.22)) }]),
  visual({ id: 'brakelamps', area: 'Lights & signals', name: 'Brake lamps', part: 'brake_c', view: { yaw: Math.PI, pitch: 0.15, k: 0.5, abs: 6 }, operate: 'Press the brake pedal',
    how: 'Have an assistant press the brake pedal and look at all three brake lamps from behind.', ref: () => 'Left, right and centre high-mounted lamps', std: 'One lamp out: major. All out: dangerous.' }, [
    { w: PW, g: 0, r: 'Left, right and centre brake lamps all light bright red.', apply: (c) => ['brake_l', 'brake_r', 'brake_c'].forEach((i) => c.setLamp(i, 1)) },
    { w: 0.13, g: 2, r: 'The left and centre lamps light. The right brake lamp stays dark.', why: 'Right brake lamp inoperative.', apply: (c) => ['brake_l', 'brake_c'].forEach((i) => c.setLamp(i, 1)) },
    { w: 0.03, g: 3, r: 'No brake lamps light when the pedal is pressed.', why: 'Following drivers get no warning of braking.', apply: () => {} }]),
  visual({ id: 'taillamps', area: 'Lights & signals', name: 'Tail & number-plate lamps', part: 'tail_l', view: { yaw: Math.PI - 0.3, pitch: 0.15, k: 0.5, abs: 6 }, operate: 'Switch on side lights',
    how: 'Switch on the side lights. Check both red tail lamps and the white number-plate lamp.', ref: () => 'Two red tail lamps, one white plate lamp', std: 'Plate lamp out: minor. A tail lamp out: major.' }, [
    { w: PW, g: 0, r: 'Both tail lamps and the plate lamp are lit.', apply: (c) => ['tail_l', 'tail_r', 'plate_lamp'].forEach((i) => c.setLamp(i, 1)) },
    { w: 0.1, g: 1, r: 'Both tail lamps are lit. The number-plate lamp is out.', why: 'Number-plate lamp inoperative.', apply: (c) => ['tail_l', 'tail_r'].forEach((i) => c.setLamp(i, 1)) },
    { w: 0.08, g: 2, r: 'The right tail lamp and plate lamp are lit. The left tail lamp is out.', why: 'Left tail lamp inoperative.', apply: (c) => ['tail_r', 'plate_lamp'].forEach((i) => c.setLamp(i, 1)) }]),

  visual({ id: 'windshield', area: 'Visibility', name: 'Windshield', part: 'windshield', view: { yaw: 0.25, pitch: 0.4, k: 1.6 },
    how: 'Examine the glass from outside and from the driver\'s seat, paying attention to the wiper-swept area.', ref: () => 'Driver\'s critical zone: the swept area directly ahead of the steering wheel', std: 'Small chip outside the swept area: minor. Damage over 10 mm in the driver\'s zone, or over 40 mm elsewhere in the swept area: major.' }, [
    { w: PW, g: 0, r: 'The glass is clear with no chips or cracks.' },
    { w: 0.1, g: 1, r: 'There is a 6 mm stone chip low in the passenger-side corner, outside the swept area.', why: 'Small damage outside the swept area.' },
    { w: 0.1, g: 2, r: 'A 120 mm crack runs from the top edge into the area swept in front of the driver.', why: 'A crack in the driver\'s view.' }]),
  visual({ id: 'wipers', area: 'Visibility', name: 'Wipers', part: 'wipers', view: { yaw: 0.2, pitch: 0.5, k: 2.4 }, operate: 'Run wipers',
    how: 'Wet the windshield and run the wipers through several strokes.', ref: () => 'Blades must clear the swept area effectively', std: 'Light smearing: minor. Torn blade or unwiped bands: major.' }, [
    { w: PW, g: 0, r: 'Both blades clear the glass cleanly in one pass.' },
    { w: 0.1, g: 1, r: 'The passenger blade leaves a light haze that clears on the return stroke.', why: 'Blade deteriorating but still effective.' },
    { w: 0.1, g: 2, r: 'The driver\'s blade rubber is torn for half its length and leaves a wide unwiped band.', why: 'The driver\'s view is not cleared.' }]),
  visual({ id: 'washer', area: 'Visibility', name: 'Windshield washers', part: 'washer_res', view: { yaw: 0.3, pitch: 0.75, k: 4 }, prep: [['hood', 1]], operate: 'Operate washers',
    how: 'Operate the washers and check the reservoir level under the hood.', ref: () => 'Washers must deliver fluid to the glass', std: 'Washers not operating: minor.' }, [
    { w: PW, g: 0, r: 'Both jets spray onto the glass. The reservoir is about three-quarters full.', apply: (c) => c.setFluid('washer', 0.75) },
    { w: 0.2, g: 1, r: 'The pump runs but nothing reaches the glass. The reservoir is empty.', why: 'Washers not operating.', apply: (c) => c.setFluid('washer', 0.03) }]),
  visual({ id: 'mirrors', area: 'Visibility', name: 'Mirrors', part: 'body', view: { yaw: -1.0, pitch: 0.2, k: 1.5 },
    how: 'Check that the driver\'s door mirror and at least one other mirror are present, secure and give a clear view.', ref: () => 'Driver-side mirror plus interior or passenger mirror', std: 'Cracked but usable: minor. Obligatory mirror missing or unusable: major.' }, [
    { w: PW + 0.05, g: 0, r: 'All mirrors are secure and give a clear view.' },
    { w: 0.08, g: 1, r: 'The passenger door mirror glass has a crack across one corner but still gives a usable view.', why: 'Slightly damaged mirror.' },
    { w: 0.07, g: 2, r: 'The driver\'s door mirror glass is missing. Only the backing plate remains.', why: 'An obligatory mirror is unusable.' }]),

  visual({ id: 'brakefluid', area: 'Under the hood', name: 'Brake fluid level', part: 'brake_res', view: { yaw: 0.2, pitch: 0.8, k: 4 }, prep: [['hood', 1]],
    how: 'Read the level against the MIN and MAX marks on the reservoir without opening it.', ref: () => 'Level must be between MIN and MAX', std: 'Below MIN: major.' }, [
    { w: PW, g: 0, r: 'The level is just below MAX. The fluid is a clear amber.', apply: (c) => c.setFluid('brake', 0.8) },
    { w: 0.2, g: 2, r: 'The level is well below the MIN mark.', why: 'Low brake fluid risks air entering the system and brake failure.', apply: (c) => c.setFluid('brake', 0.12) }]),
  visual({ id: 'coolant', area: 'Under the hood', name: 'Coolant level', part: 'coolant_res', view: { yaw: 0.3, pitch: 0.75, k: 4 }, prep: [['hood', 1]],
    how: 'With the engine cold, read the expansion tank level from the side.', ref: () => 'Level must be between MIN and MAX when cold', std: 'Below MIN: minor.' }, [
    { w: PW, g: 0, r: 'The level sits midway between MIN and MAX.', apply: (c) => c.setFluid('coolant', 0.65) },
    { w: 0.2, g: 1, r: 'The level is below the MIN mark. No leaks are visible.', why: 'Low coolant, no evidence of a leak.', apply: (c) => c.setFluid('coolant', 0.12) }]),
  visual({ id: 'oil', area: 'Under the hood', name: 'Engine oil level & leaks', part: 'dipstick', view: { yaw: 0.3, pitch: 0.7, k: 4 }, prep: [['hood', 1]], operate: 'Pull dipstick', act: [['pull', 'dipstick', 1], ['wait', 1.5], ['pull', 'dipstick', 0]],
    how: 'Pull, wipe, reinsert and read the dipstick. Look around the engine and on the floor for fresh oil.', ref: () => 'Level between the two dipstick marks', std: 'Level at or below the lower mark: minor. Oil dripping onto the ground: major.' }, [
    { w: PW, g: 0, r: 'The oil level is three-quarters of the way up between the marks. The engine is dry.' },
    { w: 0.12, g: 1, r: 'The oil only just reaches the lower mark. No external leaks.', why: 'Low oil level.' },
    { w: 0.08, g: 2, r: 'The level is mid-range, but oil is dripping steadily from the sump gasket and there is a fresh pool on the floor.', why: 'Excessive fluid leak: an environmental and fire risk.' }]),
  visual({ id: 'battery', area: 'Under the hood', name: 'Battery security', part: 'battery', view: { yaw: 0.2, pitch: 0.8, k: 3.5 }, prep: [['hood', 1]],
    how: 'Try to rock the battery by hand. Check the hold-down, terminals and case.', ref: () => 'Battery must be securely clamped with tight terminals', std: 'Light terminal corrosion: minor. Battery insecure or leaking: major.' }, [
    { w: PW, g: 0, r: 'The battery is clamped firmly. Terminals are clean and tight.' },
    { w: 0.1, g: 1, r: 'The battery is secure. There is a light white crust on the positive terminal.', why: 'Corrosion beginning on a terminal.' },
    { w: 0.1, g: 2, r: 'The hold-down bracket is missing and the battery slides about 20 mm in its tray.', why: 'An insecure battery can short against the hood or bodywork.' }]),
  visual({ id: 'belt', area: 'Under the hood', name: 'Drive belt', part: 'belt', view: { yaw: 0.9, pitch: 0.6, k: 4 }, prep: [['hood', 1]],
    how: 'Inspect the full visible length of the belt, twisting it to see the ribbed side.', ref: () => 'Belt must be intact and correctly tensioned', std: 'Fine surface cracks: minor. Fraying or missing rib sections: major.' }, [
    { w: PW + 0.04, g: 0, r: 'The ribs are intact with no cracks. Tension is correct.' },
    { w: 0.09, g: 1, r: 'There are fine hairline cracks across several ribs. No material is missing.', why: 'Belt ageing.' },
    { w: 0.07, g: 2, r: 'One edge is frayed and a 30 mm section of rib is missing.', why: 'The belt is likely to fail, taking out charging and cooling.' }]),

  visual({ id: 'exhaust', area: 'Under the vehicle', name: 'Exhaust system', part: 'muffler', view: { yaw: 2.4, pitch: -0.3, k: 2.2 }, prep: [['lift', 1]],
    how: 'With the engine running, check the full length for leaks, damage and insecure mountings.', ref: () => 'Gas-tight and securely mounted', std: 'Surface rust only: pass. Leak or failed mounting: major.' }, [
    { w: 0.55, g: 0, r: 'The system is secure and quiet with no leaks.' },
    { w: 0.25, g: 0, r: 'There is light surface rust on the muffler. It is solid when tapped, with no leaks.', why: 'Surface rust alone is not a defect.' },
    { w: 0.2, g: 2, r: 'Exhaust gas is blowing from a hole in the front of the muffler, with soot around it.', why: 'Exhaust leak.' }]),
  visual({ id: 'shocks', area: 'Under the vehicle', name: 'Shock absorbers', part: 'strut_fl', view: { yaw: -0.9, pitch: -0.15, k: 2.2 }, prep: [['lift', 1]],
    how: 'Look at each damper body for oil and check the mountings and springs.', ref: () => 'Dampers dry, springs intact', std: 'Light misting: minor. Oil running down the body, or broken spring: major.' }, [
    { w: PW, g: 0, r: 'All four dampers are dry and their mountings secure.' },
    { w: 0.1, g: 1, r: 'The front left damper has a light, dry film of oil mist near the top seal.', why: 'Slight misting only.' },
    { w: 0.1, g: 2, r: 'Fresh oil is running down the front left strut and dripping from the spring seat.', why: 'Leaking damper: reduced control and longer stopping distances.' }]),
  visual({ id: 'steering', area: 'Under the vehicle', name: 'Steering linkage', part: 'steering_rack', view: { yaw: 0.6, pitch: -0.3, k: 1.8 }, prep: [['lift', 1]],
    how: 'Have an assistant rock the steering wheel while you watch each joint. Check the rack boots.', ref: () => 'No perceptible play in joints', std: 'Split boot: minor. Play in a joint: major. Joint at risk of separating: dangerous.' }, [
    { w: PW, g: 0, r: 'All joints are tight and both rack boots are intact.' },
    { w: 0.08, g: 1, r: 'The right-hand rack boot is split and grease is escaping. The joint itself is tight.', why: 'Damaged dust boot.' },
    { w: 0.09, g: 2, r: 'There is clear movement in the left outer tie-rod end before the wheel responds.', why: 'Excessive play in a steering joint.' },
    { w: 0.03, g: 3, r: 'The left tie-rod end ball stud lifts visibly out of its socket and its retaining nut is missing.', why: 'The steering could detach.' }]),

  visual({ id: 'horn', area: 'Cabin & controls', name: 'Horn', part: 'interior', view: { yaw: -0.9, pitch: 0.3, k: 1.3 }, operate: 'Sound horn',
    how: 'Press the horn pad.', ref: () => 'A continuous, clearly audible single tone', std: 'Weak or erratic: minor. Not working: major.' }, [
    { w: PW + 0.05, g: 0, r: 'The horn gives a loud, steady tone.' },
    { w: 0.07, g: 1, r: 'The horn sounds, but it is weak and warbles.', why: 'Horn not working properly.' },
    { w: 0.08, g: 2, r: 'Nothing happens when the horn pad is pressed.', why: 'Horn inoperative.' }]),
  visual({ id: 'belts', area: 'Cabin & controls', name: 'Seat belts', part: 'interior', view: { yaw: -1.2, pitch: 0.35, k: 1.3 },
    how: 'Pull each belt out fully, check the webbing, latch the buckle and tug sharply to test the lock.', ref: () => 'Webbing undamaged, buckles latch, retractors lock', std: 'Slow retraction: minor. Cut or frayed webbing, or a buckle that will not latch: major.' }, [
    { w: PW, g: 0, r: 'Every belt extends, latches, locks on a sharp tug and retracts.' },
    { w: 0.08, g: 1, r: 'The rear centre belt retracts slowly and needs feeding back by hand.', why: 'Retractor sluggish.' },
    { w: 0.12, g: 2, r: 'The driver\'s belt webbing has a 15 mm cut in its edge at shoulder height.', why: 'Damaged webbing can tear under crash loads.' }]),
  visual({ id: 'warnings', area: 'Cabin & controls', name: 'Warning lamps', part: 'interior', view: { yaw: -0.7, pitch: 0.35, k: 1.3 }, operate: 'Ignition on, start engine',
    how: 'Turn the ignition on. All warning lamps should light for a bulb check and then go out once the engine runs.', ref: () => 'ABS, airbag, brake and engine lamps must go out', std: 'ABS, airbag or brake warning lamp staying on: major.' }, [
    { w: PW, g: 0, r: 'All lamps light for the bulb check and go out after start-up.' },
    { w: 0.1, g: 2, r: 'The ABS lamp stays on with the engine running.', why: 'ABS warning indicates a system fault.' },
    { w: 0.1, g: 2, r: 'The airbag (SRS) lamp stays on with the engine running.', why: 'SRS warning indicates the airbags may not deploy.' }]),
  visual({ id: 'parkbrake', area: 'Cabin & controls', name: 'Parking brake', part: 'interior', view: { yaw: -1.4, pitch: 0.3, k: 1.3 }, operate: 'Apply parking brake',
    how: 'Apply the parking brake and check it holds the vehicle. Note the lever travel.', ref: () => 'Must hold the vehicle; lever should lock within its normal travel', std: 'Excessive travel but holding: minor. Does not hold: major.' }, [
    { w: PW + 0.03, g: 0, r: 'The lever locks after five clicks and the vehicle is held firmly.' },
    { w: 0.08, g: 1, r: 'The lever comes almost to the top of its travel before the vehicle is held.', why: 'Needs adjustment.' },
    { w: 0.09, g: 2, r: 'With the lever fully applied, the vehicle still rolls when pushed.', why: 'Parking brake ineffective.' }]),
];

/** Build a randomised vehicle condition. Same seed + vehicle = same scenario. */
export function makeScenario(v, seed = (Math.random() * 1e9) | 0) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const r = rng(seed + attempt * 7919);
    const findings = {};
    for (const it of ITEMS) findings[it.id] = it.gen(r, v);
    const defects = Object.values(findings).filter((f) => f.truth > 0).length;
    if (defects >= 3 && defects <= 9) {
      const max = Math.max(...Object.values(findings).map((f) => f.truth));
      return { seed: seed + attempt * 7919, findings, defects, verdict: verdictFor(max) };
    }
  }
  return makeScenario(v, seed + 1);
}

/** Score an inspection. answers: { itemId: grade }, verdict: id. */
export function assess(scn, answers, verdict) {
  const rows = []; let pts = 0, inspected = 0, missedCritical = 0, falseFails = 0;
  for (const it of ITEMS) {
    const f = scn.findings[it.id], a = answers[it.id];
    let p = 0, status = 'missed';
    if (a !== undefined) {
      inspected++;
      const d = Math.abs(a - f.truth);
      if (d === 0) { p = 1; status = 'correct'; } else if (d === 1 && a > 0 && f.truth > 0) { p = 0.5; status = 'close'; } else status = a < f.truth ? 'under' : 'over';
      if (a >= 2 && f.truth < 2) falseFails++;
    }
    if (f.truth >= 2 && (a === undefined || a < 2)) missedCritical++;
    pts += p;
    rows.push({ item: it, truth: f.truth, answer: a, status, why: f.why, reading: f.reading, points: p });
  }
  const n = ITEMS.length;
  const accuracy = pts / n, coverage = inspected / n, verdictOk = verdict === scn.verdict;
  const safeSide = ['pass', 'advisory'].includes(verdict) === ['pass', 'advisory'].includes(scn.verdict);
  let score = Math.round((accuracy * 0.65 + coverage * 0.15 + (verdictOk ? 0.2 : safeSide ? 0.1 : 0)) * 100);
  const unsafeCert = !safeSide && ['pass', 'advisory'].includes(verdict);
  if (unsafeCert) score = Math.min(score, 49); else if (missedCritical) score = Math.min(score, 69);
  const passed = score >= 80 && !missedCritical && !unsafeCert;
  const band = score >= 90 ? 'Distinction' : score >= 80 ? 'Competent' : score >= 65 ? 'Developing' : 'Not yet competent';
  return { rows, score, accuracy, coverage, verdictOk, unsafeCert, missedCritical, falseFails, inspected, total: n, passed, band };
}
