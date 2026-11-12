# TorqueLab

An interactive 3D car-maintenance and safety-inspection trainer that runs in the browser.

Pick a make, model and year, then:

- **Explore** — orbit a 3D vehicle, open the hood, raise it on the lift, pull ~90 parts apart, isolate any part, and click hotspots for narrated explanations.
- **Blueprint view** — technical line-drawing render with overall dimensions.
- **Projects** — guided jobs (oil & filter, spark plugs, air filter, battery, fluids, tyres, wheel change, wipers). Starting a project creates a checklist with animated steps; progress is saved per vehicle.
- **Training** — seven short narrated lessons with knowledge checks that prepare you for the inspection.
- **Inspection** — a 30-point roadworthiness inspection on a randomly generated vehicle condition. Measure, observe, grade each item (pass / minor / major / dangerous), give a verdict, and get an item-by-item assessment and score. Passing the exam issues a printable certificate.

## Navigation

| Tool | Key | Action |
| --- | --- | --- |
| Orbit | `1` | Rotate around the point of interest |
| Pan | `2` | Slide the view across the screen plane |
| Zoom / Dolly | `3` | Move closer or farther (scroll wheel always zooms) |
| Roll | `4` | Rotate around the line of sight (`0` levels) |
| Look | `5` | Turn in place |

`W A S D` fly, `Q E` down/up, `Shift` faster. `B` blueprint, `X` x-ray, `H` hood, `L` lift, `Home` reset. The cursor changes with the active tool.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
```

`dist/` is a static site that can be hosted anywhere.

## Notes

- Vehicles are generated procedurally (`src/three/`): each model is representative of its body style and engine layout, not a scan of the real car. To reach true photorealism, swap in licensed glTF models per vehicle; parts only need to be registered with the same ids.
- Service figures in `src/data/vehicles.js` are typical reference values for training. Always confirm against the owner's manual.
- The inspection rubric (`src/data/inspection.js`) uses the minor / major / dangerous categories of EU Directive 2014/45/EU with thresholds from common international practice. It is a training aid, not a legal reference.
- Voice-over uses the browser's built-in speech synthesis.
