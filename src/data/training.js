// Inspector training: short lessons tied to the 3D model, each with a knowledge check.
const S = (h, text, part, view, act) => ({ h, text, part, view, do: act });
const Q = (q, options, a, why) => ({ q, options, a, why });

export const MODULES = [
  { id: 'method', title: 'How an inspection works', mins: 4,
    slides: [
      S('Your job as an inspector', 'A roadworthiness inspection answers one question: is this vehicle safe to share the road today? You are not servicing the car. You observe, measure, compare against the standard and record what you find.', 'body', { yaw: 0.8, pitch: 0.25, k: 1.5 }),
      S('Four outcomes for every item', 'Each item gets one of four grades. Pass means it meets the standard. Minor means a small fault with no real effect on safety, recorded as an advisory. Major means safety may be compromised, so the vehicle fails. Dangerous means an immediate risk, and the vehicle must not be driven.', 'body', { yaw: 2.2, pitch: 0.3, k: 1.5 }),
      S('The overall verdict follows the worst defect', 'One dangerous defect makes the whole result "dangerous". Otherwise one major defect makes it a fail. If you only found minors, the vehicle passes with advisories. Never certify a vehicle you did not fully inspect.', 'body', { yaw: -0.8, pitch: 0.3, k: 1.5 }),
      S('Work in a fixed order', 'Good inspectors follow the same route every time so nothing is skipped: tyres and brakes, lights, visibility, under the hood, under the vehicle, then the cabin. The checklist in the simulator follows this order.', 'body', { yaw: 0.2, pitch: 0.6, k: 1.4 }),
    ],
    quiz: [
      Q('A vehicle has two minor defects and one major defect. What is the verdict?', ['Pass with advisories', 'Fail', 'Fail — dangerous'], 1, 'The verdict follows the most serious defect. One major is enough to fail.'),
      Q('What does a "minor" grade mean?', ['The vehicle fails but can be driven', 'It is recorded as an advisory and the vehicle still passes', 'The item was not inspected'], 1, 'Minors are advisories. They do not fail the vehicle on their own.'),
      Q('You ran out of time and skipped the under-vehicle checks. You should…', ['Certify, since everything you saw was fine', 'Not certify until the inspection is complete', 'Mark the skipped items as minor'], 1, 'An incomplete inspection cannot support a certificate.'),
    ] },
  { id: 'tyres', title: 'Tyres & wheels', mins: 5,
    slides: [
      S('Pressure: compare to the placard', 'The correct cold pressure is on the placard in the driver\'s door jamb. Within ten percent of that figure is a pass. Ten to twenty-five percent out is a minor. More than twenty-five percent out is a major, and a tyre below half its placard pressure is dangerous because it can overheat and come off the rim.', 'wheel_fl', { yaw: -1.25, pitch: 0.1, k: 3.6 }),
      S('Tread depth: 1.6 millimetres is the line', 'Measure the main grooves at the inner edge, centre and outer edge, and use the lowest reading. Three millimetres or more is a pass. Between 1.6 and 3 is legal but worn, so it is a minor with advice to replace. Below 1.6 millimetres is a major.', 'wheel_fr', { yaw: 1.25, pitch: 0.1, k: 3.6 }),
      S('Structural damage is always dangerous', 'Exposed cords, a bulge in the sidewall, or a deep cut that reaches the carcass mean the tyre can fail without warning. Grade these dangerous regardless of how much tread is left.', 'wheel_rr', { yaw: 1.9, pitch: 0.1, k: 3.6 }),
    ],
    quiz: [
      Q('The placard says 35 psi. Your gauge reads 29 psi. Grade?', ['Pass', 'Minor', 'Major'], 1, '29 is about 17% under: between 10% and 25%, so minor.'),
      Q('Lowest tread reading is 1.2 mm with sound sidewalls. Grade?', ['Minor', 'Major', 'Dangerous'], 1, 'Below the 1.6 mm legal minimum is a major defect.'),
      Q('Tread is 6 mm but there is a bulge on the sidewall. Grade?', ['Pass', 'Major', 'Dangerous'], 2, 'A bulge means the structure has failed. Dangerous, whatever the tread.'),
    ] },
  { id: 'brakes', title: 'Brakes', mins: 4,
    slides: [
      S('Pad thickness', 'With the wheel off, measure the friction material on the thinnest pad. Four millimetres or more is a pass. Three to four is a minor. Between one and a half and three is a major. Under one and a half, or metal touching the disc, is dangerous.', 'pads_fl', { yaw: -1.2, pitch: 0.12, k: 5 }, [['lift', 1], ['pull', 'lugs_fl', 1], ['pull', 'wheel_fl', 1]]),
      S('Brake fluid', 'The reservoir sits on the master cylinder at the back of the engine bay. Read it from the side. A level below the MIN mark is a major defect, because air can be drawn into the hydraulic system.', 'brake_res', { yaw: 0.2, pitch: 0.8, k: 4 }, [['lift', 0], ['pull', 'wheel_fl', 0], ['pull', 'lugs_fl', 0], ['hood', 1]]),
      S('Parking brake and warning lamps', 'The parking brake must hold the vehicle. Excessive lever travel is a minor. Failing to hold is a major. A brake or ABS warning lamp that stays on after start-up is also a major.', 'interior', { yaw: -1.2, pitch: 0.3, k: 1.3 }, [['hood', 0]]),
    ],
    quiz: [
      Q('Thinnest pad measures 3.4 mm. Grade?', ['Pass', 'Minor', 'Major'], 1, '3.0–3.9 mm is a minor: legal, but replacement is due soon.'),
      Q('Brake fluid is well below MIN. Grade?', ['Minor', 'Major', 'Pass, just top it up'], 1, 'Below MIN is a major. The inspector records it; topping up is a repair.'),
      Q('The pad backing plate is grinding on the disc. Grade?', ['Major', 'Dangerous', 'Minor'], 1, 'Metal-to-metal contact is dangerous.'),
    ] },
  { id: 'lights', title: 'Lights & signals', mins: 4,
    slides: [
      S('Headlamps', 'Switch on the low beams and look from the front. Both must light. One lamp out is a major. With both out there is no forward lighting at all, which is dangerous.', 'head_l', { yaw: 0, pitch: 0.12, abs: 6 }, [['lamp', 'head_l', 1], ['lamp', 'head_r', 1]]),
      S('Brake lamps', 'There are three: left, right and the high-mounted centre lamp. One out is a major. All out is dangerous, because drivers behind get no warning.', 'brake_c', { yaw: Math.PI, pitch: 0.15, abs: 6 }, [['lampsoff'], ['lamp', 'brake_l', 1], ['lamp', 'brake_r', 1], ['lamp', 'brake_c', 1]]),
      S('Indicators, tail and plate lamps', 'Any indicator not working is a major. A fast flash rate tells you a bulb has failed. A tail lamp out is a major. The number-plate lamp is less critical, so that is a minor.', 'tail_l', { yaw: Math.PI - 0.4, pitch: 0.15, abs: 6 }, [['lampsoff'], ['lamp', 'tail_l', 1], ['lamp', 'tail_r', 1], ['lamp', 'plate_lamp', 1], ['blink', 'ind_rl'], ['blink', 'ind_rr']]),
    ],
    quiz: [
      Q('The number-plate lamp is out. Everything else works. Grade?', ['Minor', 'Major', 'Pass'], 0, 'The plate lamp is a minor.'),
      Q('Indicators flash very quickly on one side. What does it suggest?', ['The battery is weak', 'A bulb has failed on that side', 'Nothing, it is normal'], 1, 'A fast flash is the built-in bulb-failure warning.'),
      Q('The right brake lamp does not light; left and centre do. Grade?', ['Minor', 'Major', 'Dangerous'], 1, 'One brake lamp out is a major.'),
    ] },
  { id: 'visibility', title: 'Visibility', mins: 3,
    slides: [
      S('Windshield zones', 'Damage matters most where the driver looks. A small chip outside the wiper-swept area is a minor. Damage larger than 10 millimetres directly in front of the driver, or any crack running through the driver\'s view, is a major.', 'windshield', { yaw: 0.25, pitch: 0.4, k: 1.6 }, [['lampsoff']]),
      S('Wipers and washers', 'Wet the glass and run the wipers. Light smearing is a minor. A torn blade or unwiped bands is a major. Washers that deliver no fluid are a minor.', 'wipers', { yaw: 0.2, pitch: 0.5, k: 2.4 }),
      S('Mirrors', 'The driver\'s door mirror plus at least one other mirror must give a clear view. A cracked but usable mirror is a minor. A missing or unusable obligatory mirror is a major.', 'body', { yaw: -1.0, pitch: 0.2, k: 1.5 }),
    ],
    quiz: [
      Q('A 120 mm crack runs into the area swept in front of the driver. Grade?', ['Minor', 'Major', 'Pass'], 1, 'A crack in the driver\'s view is a major.'),
      Q('The washer reservoir is empty and nothing sprays. Grade?', ['Minor', 'Major', 'Dangerous'], 0, 'Washers not operating is a minor in this standard.'),
    ] },
  { id: 'underhood', title: 'Under the hood', mins: 4,
    slides: [
      S('Fluids at a glance', 'Coolant below MIN is a minor. Oil at or below the lower dipstick mark is a minor. Oil actively dripping onto the ground is a major, because leaks are both a fire and an environmental risk.', 'dipstick', { yaw: 0.3, pitch: 0.7, k: 4 }, [['hood', 1]]),
      S('Battery', 'Try to rock the battery by hand. It must not move. Light corrosion on a terminal is a minor. A missing hold-down or a leaking case is a major.', 'battery', { yaw: 0.2, pitch: 0.8, k: 3.5 }, [['hood', 1]]),
      S('Drive belt', 'Look along the ribbed side. Fine hairline cracks are a minor. Fraying edges or missing sections of rib are a major, because the belt drives the alternator and often the water pump.', 'belt', { yaw: 0.9, pitch: 0.6, k: 4 }, [['hood', 1]]),
    ],
    quiz: [
      Q('Oil level is fine, but oil drips steadily from the sump. Grade?', ['Pass', 'Minor', 'Major'], 2, 'An active leak dripping to the ground is a major.'),
      Q('The battery hold-down is missing and the battery slides in its tray. Grade?', ['Minor', 'Major', 'Pass'], 1, 'An insecure battery is a major.'),
    ] },
  { id: 'under', title: 'Under the vehicle & cabin', mins: 4,
    slides: [
      S('Exhaust', 'Surface rust on a solid exhaust is normal and is a pass. A gas leak, a hole, or a failed mounting is a major.', 'muffler', { yaw: 2.4, pitch: -0.3, k: 2.2 }, [['hood', 0], ['lift', 1]]),
      S('Suspension and steering', 'A light, dry oil mist on a damper is a minor. Oil running down the body is a major. In the steering, a split boot is a minor, play in a joint is a major, and a joint that could separate is dangerous.', 'steering_rack', { yaw: 0.6, pitch: -0.3, k: 1.8 }, [['lift', 1]]),
      S('Inside the cabin', 'Check the horn, every seat belt, the warning lamps and the parking brake. A dead horn, cut belt webbing, or an airbag or ABS lamp that stays on are all majors.', 'interior', { yaw: -1.0, pitch: 0.35, k: 1.3 }, [['lift', 0]]),
    ],
    quiz: [
      Q('The muffler has surface rust but is solid and leak-free. Grade?', ['Pass', 'Minor', 'Major'], 0, 'Surface rust alone is not a defect.'),
      Q('The tie-rod end lifts out of its socket and the nut is missing. Grade?', ['Minor', 'Major', 'Dangerous'], 2, 'The steering could separate: dangerous.'),
      Q('The airbag lamp stays on after start-up. Grade?', ['Pass', 'Minor', 'Major'], 2, 'An SRS warning is a major.'),
    ] },
];
