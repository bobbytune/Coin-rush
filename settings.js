// Coin Rush settings: change pickups, race rules and characters here.
// =====================================================================
//  CUSTOMISE HERE
// =====================================================================
const COIN_SETTINGS = {
  shape: 'pill',          // 'pill', 'coin', 'gem', 'ring' or 'star'
  name: 'pills',          // what the results screen calls them
  color: '#4cc38a',       // main colour (the green half of the pill)
  secondColor: '#f2f5f3', // other half of the pill
  outlineColor: '#1f4d3a',// dark outline round the pill
  glowColor: '#2e9e68',   // soft glow colour
  size: 1.3,              // how big each pickup is
  spinSpeed: 3,           // how fast it spins
  value: 1,               // boost each pickup adds
  coinsForFullBoost: 6,   // pickups needed to fill the meter
  boostSeconds: 3,        // how long a full meter lasts
  boostPower: 0.6,        // +60% top speed while boosting
  respawnSeconds: 8,      // time before a collected pickup comes back
  spacing: 22,            // gap between pickups along the road (bigger = fewer)
};
const RACE_SETTINGS = { laps: 3, topSpeed: 52 };
// Swap these for your own characters later. 'skill' is how fast the AI drives (1 = same as you).
const RACERS = [
  { name: 'Rival 1', color: '#3a86ff', skill: 0.93 },
  { name: 'Rival 2', color: '#8ac926', skill: 0.97 },
  { name: 'Rival 3', color: '#ff9f1c', skill: 1.0 },
  { name: 'You',     color: '#ff4f8b', player: true },
];

// Cars you can pick in the garage. 'model' is the 3D shape from cars.js.
// Stats: 1 = normal. speed = top speed, accel = how fast it gets there, handling = steering and grip,
// weight = how hard it shoves other cars, boost = boost strength. offroad: true = less slowdown on grass and dirt.
const CARS = [
  { id: 'furia',   name: 'Furia V12',   blurb: 'Italian-style wedge supercar. Blistering top speed, twitchy in the bends.', speed: 1.12, accel: 1.06, handling: 0.94, weight: 0.95, boost: 1.0 },
  { id: 'spyder',  name: 'Furia Spyder', blurb: 'The Furia with the roof chopped off. Lighter, sharper, and everyone can see you.', speed: 1.1, accel: 1.08, handling: 1.0, weight: 0.9, boost: 1.0 },
  { id: 'raijin',  name: 'Raijin GT',   blurb: 'Japanese grand tourer. Grips like glue and launches hard.',                speed: 1.05, accel: 1.12, handling: 1.1,  weight: 1.1,  boost: 1.0 },
  { id: 'bruiser', name: 'Bruiser 69',  blurb: 'Old-school muscle. Huge grunt, heavy, slides wide.',                        speed: 1.08, accel: 1.1,  handling: 0.86, weight: 1.35, boost: 1.1 },
  { id: 'dropTop', name: 'Bruiser Drop-Top', blurb: 'Convertible muscle. All the grunt, plus the wind in your hair.', speed: 1.06, accel: 1.1, handling: 0.9, weight: 1.25, boost: 1.1 },
  { id: 'zippy',   name: 'Zippy R',     blurb: 'Hot hatch. Not the fastest, but it turns on a penny.',                       speed: 0.96, accel: 1.06, handling: 1.18, weight: 0.85, boost: 1.15 },
  { id: 'dune',    name: 'Sand Flea',   blurb: 'Dune buggy. Barely slows down on grass and dirt shortcuts.',                 speed: 0.95, accel: 1.12, handling: 1.08, weight: 0.85, boost: 1.0, offroad: true },
  { id: 'roadster',  name: 'Coastline 57',   blurb: 'Fifties roadster with chrome bumpers. Smooth, balanced and stylish.',                 speed: 1.0,  accel: 1.02, handling: 1.08, weight: 1.0,  boost: 1.1 },
  { id: 'hotrod',    name: 'Hot Rod',        blurb: 'All engine, huge back wheels. Rockets off the line, wobbly in the bends.',           speed: 1.04, accel: 1.18, handling: 0.84, weight: 1.15, boost: 1.15 },
  { id: 'formula',   name: 'Formula X',      blurb: 'Open-wheel single-seater. Fastest in the corners, hates the grass.',                 speed: 1.1,  accel: 1.12, handling: 1.22, weight: 0.8,  boost: 0.95 },
  { id: 'kart',      name: 'Go-Kart',        blurb: 'Tiny, twitchy and hilarious. Low top speed but turns instantly.',                    speed: 0.9,  accel: 1.15, handling: 1.25, weight: 0.7,  boost: 1.25 },
  { id: 'trail',     name: 'Trail 4x4',      blurb: 'Open-top off-roader. Shrugs off grass and dirt, built like a tank.',                 speed: 0.95, accel: 1.0,  handling: 0.98, weight: 1.45, boost: 1.05, offroad: true },
  { id: 'barchetta', name: 'Furia Barchetta',blurb: 'Hypercar speedster with a wraparound visor. No roof, no windscreen, no fear.',       speed: 1.13, accel: 1.08, handling: 0.98, weight: 0.88, boost: 1.0 },
  { id: 'hauler',  name: 'Hauler',      blurb: 'Delivery van. Slow, but nothing pushes it around.',                          speed: 0.92, accel: 0.9,  handling: 0.92, weight: 1.7,  boost: 1.2 },
];
const PAINT_COLORS = ['#ff4f8b', '#e63946', '#ff9f1c', '#ffd23f', '#8ac926', '#2ec4b6', '#3a86ff', '#9b5de5', '#f1faee', '#22223b'];
const RIM_COLORS = { Silver: '#c9ced6', Black: '#22222a', Gold: '#d4af37', Neon: '#4de8e0' };
// =====================================================================
