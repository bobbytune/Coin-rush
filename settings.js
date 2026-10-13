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
// =====================================================================
