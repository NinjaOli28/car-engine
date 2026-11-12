// Vehicle catalogue. Service figures are typical reference values for training —
// always confirm against the owner's manual and the door-jamb tyre placard.
const V = (o) => o;

export const VEHICLES = [
  V({ id: 'camry', make: 'Toyota', model: 'Camry', years: [2018, 2019, 2020, 2021, 2022, 2023, 2024], style: 'sedan',
    engine: { layout: 'I4', mount: 'transverse', label: '2.5 L inline-4' },
    dims: { L: 4.88, W: 1.84, H: 1.445, wb: 2.825, tireR: 0.335 },
    specs: { oilType: '0W-20 full synthetic', oilQt: 4.8, drainTorque: 40, filter: 'cartridge element', plug: 'Iridium, long-reach', plugGap: 1.1, plugTorque: 18,
      psiF: 35, psiR: 35, tire: '235/45R18', lugTorque: 103, coolant: 'Pink long-life (OAT)', battery: 'Group 24F', wiperD: 26, wiperP: 18 } }),
  V({ id: 'rav4', make: 'Toyota', model: 'RAV4', years: [2019, 2020, 2021, 2022, 2023, 2024], style: 'suv',
    engine: { layout: 'I4', mount: 'transverse', label: '2.5 L inline-4' },
    dims: { L: 4.6, W: 1.855, H: 1.7, wb: 2.69, tireR: 0.36 },
    specs: { oilType: '0W-16 full synthetic', oilQt: 4.8, drainTorque: 40, filter: 'cartridge element', plug: 'Iridium, long-reach', plugGap: 1.1, plugTorque: 18,
      psiF: 35, psiR: 35, tire: '225/65R17', lugTorque: 103, coolant: 'Pink long-life (OAT)', battery: 'Group 24F', wiperD: 26, wiperP: 16 } }),
  V({ id: 'civic', make: 'Honda', model: 'Civic', years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023], style: 'sedan',
    engine: { layout: 'I4', mount: 'transverse', label: '2.0 L inline-4' },
    dims: { L: 4.65, W: 1.8, H: 1.415, wb: 2.7, tireR: 0.32 },
    specs: { oilType: '0W-20 full synthetic', oilQt: 4.4, drainTorque: 39, filter: 'spin-on canister', plug: 'Iridium', plugGap: 1.1, plugTorque: 18,
      psiF: 32, psiR: 32, tire: '215/55R16', lugTorque: 108, coolant: 'Blue Type 2', battery: 'Group 51R', wiperD: 26, wiperP: 18 } }),
  V({ id: 'crv', make: 'Honda', model: 'CR-V', years: [2017, 2018, 2019, 2020, 2021, 2022, 2023], style: 'suv',
    engine: { layout: 'I4', mount: 'transverse', label: '1.5 L turbo inline-4' },
    dims: { L: 4.63, W: 1.855, H: 1.68, wb: 2.66, tireR: 0.355 },
    specs: { oilType: '0W-20 full synthetic', oilQt: 3.7, drainTorque: 39, filter: 'spin-on canister', plug: 'Iridium', plugGap: 0.75, plugTorque: 18,
      psiF: 33, psiR: 33, tire: '235/60R18', lugTorque: 108, coolant: 'Blue Type 2', battery: 'Group 51R', wiperD: 26, wiperP: 17 } }),
  V({ id: 'f150', make: 'Ford', model: 'F-150', years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023], style: 'pickup',
    engine: { layout: 'V6', mount: 'longitudinal', label: '3.5 L V6' },
    dims: { L: 5.89, W: 2.03, H: 1.96, wb: 3.68, tireR: 0.41 },
    specs: { oilType: '5W-30 synthetic blend', oilQt: 6.0, drainTorque: 27, filter: 'spin-on canister', plug: 'Iridium', plugGap: 0.8, plugTorque: 15,
      psiF: 35, psiR: 35, tire: '275/65R18', lugTorque: 150, coolant: 'Yellow (OAT)', battery: 'Group 65', wiperD: 22, wiperP: 22 } }),
  V({ id: 'mustang', make: 'Ford', model: 'Mustang', years: [2018, 2019, 2020, 2021, 2022, 2023], style: 'coupe',
    engine: { layout: 'V6', mount: 'longitudinal', label: '3.7 L V6' },
    dims: { L: 4.79, W: 1.92, H: 1.38, wb: 2.72, tireR: 0.34 },
    specs: { oilType: '5W-20 synthetic blend', oilQt: 6.0, drainTorque: 27, filter: 'spin-on canister', plug: 'Iridium', plugGap: 1.3, plugTorque: 15,
      psiF: 32, psiR: 32, tire: '235/55R17', lugTorque: 150, coolant: 'Orange (OAT)', battery: 'Group 96R', wiperD: 22, wiperP: 20 } }),
  V({ id: 'golf', make: 'Volkswagen', model: 'Golf', years: [2015, 2016, 2017, 2018, 2019, 2020, 2021], style: 'hatch',
    engine: { layout: 'I4', mount: 'transverse', label: '1.4 L TSI inline-4' },
    dims: { L: 4.26, W: 1.79, H: 1.45, wb: 2.64, tireR: 0.315 },
    specs: { oilType: '5W-30 (VW 504 00)', oilQt: 4.2, drainTorque: 30, filter: 'spin-on canister', plug: 'Iridium', plugGap: 0.7, plugTorque: 22,
      psiF: 33, psiR: 33, tire: '205/55R16', lugTorque: 89, coolant: 'G13 violet', battery: 'Group H5', wiperD: 26, wiperP: 18 } }),
  V({ id: 'frontier', make: 'Nissan', model: 'Frontier', years: [2022, 2023, 2024], style: 'pickup',
    engine: { layout: 'V6', mount: 'longitudinal', label: '3.8 L V6' },
    dims: { L: 5.34, W: 1.9, H: 1.83, wb: 3.2, tireR: 0.39 },
    specs: { oilType: '0W-20 full synthetic', oilQt: 5.7, drainTorque: 34, filter: 'spin-on canister', plug: 'Iridium', plugGap: 1.1, plugTorque: 18,
      psiF: 35, psiR: 35, tire: '265/70R17', lugTorque: 98, coolant: 'Blue long-life', battery: 'Group 24F', wiperD: 22, wiperP: 18 } }),
  V({ id: 'tucson', make: 'Hyundai', model: 'Tucson', years: [2019, 2020, 2021, 2022, 2023, 2024], style: 'suv',
    engine: { layout: 'I4', mount: 'transverse', label: '2.5 L inline-4' },
    dims: { L: 4.63, W: 1.865, H: 1.665, wb: 2.755, tireR: 0.355 },
    specs: { oilType: '0W-20 full synthetic', oilQt: 5.1, drainTorque: 33, filter: 'cartridge element', plug: 'Iridium', plugGap: 1.1, plugTorque: 18,
      psiF: 35, psiR: 35, tire: '235/60R18', lugTorque: 85, coolant: 'Green/blue phosphate OAT', battery: 'Group H6', wiperD: 26, wiperP: 16 } }),
];

export const PAINTS = [
  { id: 'red', name: 'Soul Red', hex: 0x7a0c14 },
  { id: 'blue', name: 'Deep Ocean', hex: 0x0d2a5c },
  { id: 'silver', name: 'Liquid Silver', hex: 0x9aa0a6 },
  { id: 'white', name: 'Pearl White', hex: 0xe6e6e2 },
  { id: 'graphite', name: 'Graphite', hex: 0x24272b },
  { id: 'green', name: 'Forest', hex: 0x12382a },
];

export const MAKES = [...new Set(VEHICLES.map((v) => v.make))];
export const getVehicle = (id) => VEHICLES.find((v) => v.id === id);
export const litres = (qt) => (qt * 0.946).toFixed(1);
export const nm = (lbft) => Math.round(lbft * 1.356);
export const bar = (psi) => (psi * 0.0689).toFixed(1);
