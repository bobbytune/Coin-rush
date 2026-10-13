// Coin Rush game code: driving, AI, coins, HUD and race flow.
// The map itself lives in map.js; settings and characters live in settings.js.
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = rng(42);
const GRAVITY = 35;

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
if (renderer.shadowMap) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 900);
function resize(){ const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const MAP = buildMap(scene, renderer);
// reflections for shiny car paint: a blurred copy of the sky and ground
try {
  const envScene = new THREE.Scene(), g = new THREE.SphereGeometry(10, 32, 16), p = g.attributes.position, cols = [], c = new THREE.Color();
  const top = new THREE.Color(MAP_THEME.skyTop || MAP_THEME.sky), hor = new THREE.Color(MAP_THEME.sky), grd = new THREE.Color(MAP_THEME.grass).multiplyScalar(0.6);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(grd, Math.min(1, -y * 4)); cols.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sunBlob = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); sunBlob.position.set(5, 7, 3); envScene.add(sunBlob);
  window.CAR_ENV = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02).texture;
} catch (e) { window.CAR_ENV = null; }
document.body.style.background = MAP_THEME.sky;
const S = MAP.samples, N = MAP.N;
const mat = c => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));

// ---------- coins ----------
function coinGeometry(){
  const s = COIN_SETTINGS.size;
  if (COIN_SETTINGS.shape === 'gem') return new THREE.OctahedronGeometry(s * 0.9);
  if (COIN_SETTINGS.shape === 'ring') return new THREE.TorusGeometry(s * 0.7, s * 0.22, 10, 24);
  if (COIN_SETTINGS.shape === 'star') {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: s * 0.3, bevelEnabled: false }); g.center(); return g;
  }
  const g = new THREE.CylinderGeometry(s * 0.8, s * 0.8, s * 0.22, 24); g.rotateX(Math.PI / 2); return g;
}
// pill: a capsule with one coloured half and one white half, with a dark outline, tilted like the icon
const PILL = COIN_SETTINGS.shape === 'pill';
const pillParts = PILL ? (function(){
  const s = COIN_SETTINGS.size, r = s * 0.5, L = s * 0.6, outline = s * 0.12;
  const capTop = new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); capTop.translate(0, L, 0);
  const capBot = new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); capBot.translate(0, -L, 0);
  const halfTop = new THREE.CylinderGeometry(r, r, L, 18, 1, true); halfTop.translate(0, L / 2, 0);
  const halfBot = new THREE.CylinderGeometry(r, r, L, 18, 1, true); halfBot.translate(0, -L / 2, 0);
  const oCyl = new THREE.CylinderGeometry(r + outline, r + outline, L * 2, 18, 1, true);
  const oTop = new THREE.SphereGeometry(r + outline, 18, 10); oTop.translate(0, L, 0);
  const oBot = new THREE.SphereGeometry(r + outline, 18, 10); oBot.translate(0, -L, 0);
  const band = new THREE.CylinderGeometry(r + outline * 0.5, r + outline * 0.5, outline * 1.2, 18);
  const shine = new THREE.BoxGeometry(r * 0.18, L * 0.7, r * 0.18); shine.translate(-r * 0.55, -L * 0.9, r * 0.75);
  const std = (c, e) => new THREE.MeshStandardMaterial({ color: c, emissive: e || c, emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.05 });
  return {
    color: std(COIN_SETTINGS.color, COIN_SETTINGS.glowColor), second: std(COIN_SETTINGS.secondColor || '#f2f5f3'),
    outline: new THREE.MeshBasicMaterial({ color: COIN_SETTINGS.outlineColor || '#1f4d3a', side: THREE.BackSide }),
    band: new THREE.MeshBasicMaterial({ color: COIN_SETTINGS.outlineColor || '#1f4d3a' }), shineMat: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    capTop, capBot, halfTop, halfBot, oCyl, oTop, oBot, bandGeo: band, shine,
  };
})() : null;
function makePickup(){
  if (!PILL) return new THREE.Mesh(coinGeo, coinMat);
  const P = pillParts, g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt); tilt.rotation.z = Math.PI / 4;
  [[P.capTop, P.second], [P.halfTop, P.second], [P.capBot, P.color], [P.halfBot, P.color], [P.oCyl, P.outline], [P.oTop, P.outline], [P.oBot, P.outline], [P.bandGeo, P.band], [P.shine, P.shineMat]]
    .forEach(([geo, m]) => tilt.add(new THREE.Mesh(geo, m)));
  return g;
}
const coinGeo = PILL ? null : coinGeometry();
const coinMat = PILL ? null : new THREE.MeshStandardMaterial({ color: COIN_SETTINGS.color, emissive: COIN_SETTINGS.glowColor, emissiveIntensity: 0.35, metalness: 0.5, roughness: 0.35 });
if (PILL) {
  const ico = $('coinIco'), oc = COIN_SETTINGS.outlineColor || '#1f4d3a';
  Object.assign(ico.style, { width: '26px', height: '13px', borderRadius: '7px', transform: 'rotate(-45deg)', boxShadow: 'none',
    border: `2px solid ${oc}`, background: `linear-gradient(90deg, ${COIN_SETTINGS.color} 50%, ${oc} 50%, ${oc} calc(50% + 2px), ${COIN_SETTINGS.secondColor || '#f2f5f3'} calc(50% + 2px))` });
} else $('coinIco').style.background = COIN_SETTINGS.color;
const coins = [];
function addCoin(x, y, z){ coins.push({ x, y, z, active: true, back: 0, phase: rand() * 6 }); }
// all pickups are drawn as instances (two draw calls in total), updated every frame
function mergeParts(parts){
  const P = [], Nn = [], C = [], col = new THREE.Color();
  parts.forEach(([geo, color]) => { const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, n = g.attributes.normal; col.set(color);
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(n.getX(i), n.getY(i), n.getZ(i)); C.push(col.r, col.g, col.b); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
let pickupMeshes = [];
function buildPickupMeshes(){
  const n = coins.length;
  if (PILL) {
    const P = pillParts, oc = COIN_SETTINGS.outlineColor || '#1f4d3a';
    const body = mergeParts([[P.capTop, COIN_SETTINGS.secondColor || '#f2f5f3'], [P.halfTop, COIN_SETTINGS.secondColor || '#f2f5f3'], [P.capBot, COIN_SETTINGS.color], [P.halfBot, COIN_SETTINGS.color], [P.bandGeo, oc], [P.shine, '#ffffff']]);
    const outline = mergeParts([[P.oCyl, oc], [P.oTop, oc], [P.oBot, oc]]);
    body.rotateZ(Math.PI / 4); outline.rotateZ(Math.PI / 4);
    pickupMeshes = [
      new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.05, emissive: COIN_SETTINGS.glowColor, emissiveIntensity: 0.12 }), n),
      new THREE.InstancedMesh(outline, new THREE.MeshBasicMaterial({ color: oc, side: THREE.BackSide }), n),
    ];
  } else pickupMeshes = [new THREE.InstancedMesh(coinGeo, coinMat, n)];
  pickupMeshes.forEach(m => { m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); });
}
const pickO = new THREE.Object3D();
function updatePickups(t){
  coins.forEach((k, i) => {
    pickO.position.set(k.x, k.y + Math.sin(t * 3 + k.phase) * 0.25, k.z);
    pickO.rotation.set(0, t * COIN_SETTINGS.spinSpeed + k.phase, 0);
    const sc = k.active ? 1 : 0; pickO.scale.set(sc, sc, sc); pickO.updateMatrix();
    pickupMeshes.forEach(m => m.setMatrixAt(i, pickO.matrix));
  });
  pickupMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });
}
const nearRamp = (x, z) => MAP.ramps.some(r => { const s = (x - r.x) * r.dx + (z - r.z) * r.dz, l = (x - r.x) * -r.dz + (z - r.z) * r.dx; return s > -6 && s < r.len + 48 && Math.abs(l) < r.w / 2 + 2; });
(function placeCoins(){
  const step = Math.max(2, Math.round(COIN_SETTINGS.spacing / MAP.ds));
  for (let i = 8; i < N - 4; i += step) {
    const s = S[i], off = Math.sin(i * MAP.ds * 0.045) * (MAP.half - 4);
    const x = s.x - s.tz * off, z = s.z + s.tx * off;
    if (!nearRamp(x, z)) addCoin(x, 1.6, z);
  }
  MAP.shortcuts.forEach(sc => { for (let i = 6; i < sc.samples.length - 6; i += step) { const s = sc.samples[i]; if (!nearRamp(s.x, s.z) && MAP.surfaceAt(s.x, s.z) !== 'water') addCoin(s.x, 1.6, s.z); } });
  // a trail of coins through the air after every ramp
  MAP.ramps.forEach(r => {
    const v = 46, vy = v * r.h / r.len;
    for (let t = 0.2; t < 0.8; t += 0.2) { const d = r.len + v * t, y = r.h + vy * t - 0.5 * GRAVITY * t * t + 1.3; addCoin(r.x + r.dx * d, y, r.z + r.dz * d); }
  });
})();
buildPickupMeshes();
// instanced scenery is spread over the whole map, so never skip drawing it based on its origin
scene.traverse(m => { if (m.isInstancedMesh) m.frustumCulled = false; });

// ---------- cars ----------
const carById = id => CARS.find(c => c.id === id) || CARS[0];
function loadPref(key, fallback){ try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
function savePref(key, v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
const myCar = Object.assign({ id: CARS[0].id, paint: (RACERS.find(r => r.player) || {}).color || PAINT_COLORS[0], rim: 'Silver', driver: CHARACTERS[0].id }, loadPref('coinrush-car', {}));
if (!CHARACTERS.some(c => c.id === myCar.driver)) myCar.driver = CHARACTERS[0].id;
const charById = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
if (!CARS.some(c => c.id === myCar.id)) myCar.id = CARS[0].id;
if (!RIM_COLORS[myCar.rim]) myCar.rim = 'Silver';
function setCarModel(c, id, paint, rimName, driverId){
  if (c.root) { scene.remove(c.root); scene.remove(c.shadow); }
  const spec = carById(id), m = buildCarModel(spec.id, paint, RIM_COLORS[rimName] || RIM_COLORS.Silver);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.add(m.group);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(m.width * 0.62, m.length * 0.56, 1);
  scene.add(shadow); scene.add(root);
  if (m.seat) { const d = buildCharacter(driverId || c.driver || CHARACTERS[0].id, 'seated', paint); d.position.set(m.seat.x, m.seat.y, m.seat.z); m.group.add(d); }
  Object.assign(c, { root, body, shadow, wheels: m.wheels, pivots: m.pivots, flames: m.flames, spec, color: paint });
}
const racers = RACERS.map((r, i) => ({ name: r.name, color: r.color, baseColor: r.color, player: !!r.player, skill: r.skill || 1, slot: i, lane: (i % 2 ? 4 : -4) + (rand() - 0.5) * 2 }));
const player = racers.find(r => r.player);
function assignCars(){
  const pool = CARS.filter(c => c.id !== myCar.id), order = (pool.length ? pool : CARS).slice().sort(() => rand() - 0.5);
  let k = 0;
  const drivers = CHARACTERS.filter(ch => ch.id !== myCar.driver).sort(() => rand() - 0.5);
  let dk = 0;
  racers.forEach(c => {
    if (c.player) { c.driver = myCar.driver; setCarModel(c, myCar.id, myCar.paint, myCar.rim, myCar.driver); return; }
    const d = drivers.length ? drivers[dk++ % drivers.length] : CHARACTERS[0];
    c.driver = d.id; if (CHARACTERS.length > 1) c.name = d.name;
    setCarModel(c, order[k++ % order.length].id, c.baseColor, 'Silver', d.id);
  });
}
assignCars();

// progress round the lap is measured along the road, so laps only count when you go all the way round
function trackS(i){ return i * MAP.ds; }
function placeOnGrid(c){
  const back = Math.round((14 + Math.floor(c.slot / 2) * 11) / MAP.ds);
  const idx = (N - back) % N, s = S[idx], side = c.slot % 2 ? 4.5 : -4.5;
  c.x = s.x - s.tz * side; c.z = s.z + s.tx * side; c.h = Math.atan2(s.tx, s.tz);
  c.y = 0; c.vy = 0; c.air = false; c.lastRamp = null;
  c.vx = c.vz = 0; c.vf = 0; c.vl = 0; c.steerVis = 0;
  c.idx = idx; c.dist = trackS(idx) - MAP.total;
  c.finished = false; c.finishTime = 0; c.stuck = 0; c.reverseT = 0; c.boosting = false; c.wrongT = 0;
}
function updateProgress(c){
  const ni = MAP.nearestIndex(c.x, c.z, c.idx, 20, 200);
  let delta = trackS(ni) - trackS(c.idx);
  if (delta < -MAP.total / 2) delta += MAP.total;
  if (delta > MAP.total / 2) delta -= MAP.total;
  c.dist += delta; c.idx = ni;
}
const lapsDone = c => Math.floor(c.dist / MAP.total);
const progress = c => c.finished ? 1e9 - c.finishTime : c.dist;

// ---------- input ----------
const keys = {};
const KEYMAP = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'hand', ShiftLeft: 'boost', ShiftRight: 'boost', KeyE: 'boost' };
addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (k) { keys[k] = true; e.preventDefault(); } if (e.code === 'KeyR' && state === 'race') resetCar(player); });
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
if (matchMedia('(pointer: coarse)').matches) {
  $('touch').hidden = false; $('boostHint').textContent = 'Tap and hold BOOST';
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); keys[k] = true; b.classList.add('held'); };
    const off = () => { keys[k] = false; b.classList.remove('held'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
  $('boost').style.bottom = 'calc(10px + env(safe-area-inset-bottom,0px))';
}

// ---------- sound ----------
let actx = null;
function blip(f1, f2, dur = 0.09, vol = 0.12, type = 'square'){
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
}

// ---------- physics ----------
let boostMeter = 0, totalCoins = 0, shake = 0;
function drive(c, inp, dt){
  if (c.air) { airControl(c, inp, dt); c.x += c.vx * dt; c.z += c.vz * dt; collideWorld(c); return; }
  const surface = MAP.surfaceAt(c.x, c.z);
  if (surface === 'water' && c.y < 0.3) { splash(c); return; }
  let surfMul = { road: 1, alley: MAP_LAYOUT.alleySpeed, dirt: MAP_LAYOUT.dirtSpeed }[surface] || MAP_LAYOUT.grassSpeed;
  if (c.spec.offroad) surfMul = Math.max(surfMul, 0.95);
  const st = c.spec;
  const sh = Math.sin(c.h), ch = Math.cos(c.h);
  let vf = c.vx * sh + c.vz * ch, vl = c.vx * ch - c.vz * sh;
  const top = RACE_SETTINGS.topSpeed * st.speed * c.topMul * surfMul * (c.boosting ? 1 + COIN_SETTINGS.boostPower * (st.boost || 1) : 1);
  if (inp.gas) vf += 30 * st.accel * (c.boosting ? 1.8 : 1) * dt;
  if (inp.brake) vf -= (vf > 0 ? 48 : 18) * dt;
  if (!inp.gas && !inp.brake) vf *= 1 - 0.7 * dt;
  if (vf > top) vf -= (vf - top) * 2.5 * dt;
  if (vf < -16) vf = -16;
  vl *= Math.exp(-(inp.hand ? 1.4 : (surface === 'road' || surface === 'alley' || st.offroad ? 7.5 : 5) * st.handling) * dt);
  if (inp.hand) vf *= 1 - 0.5 * dt;
  const turn = (inp.hand ? 2.7 : 1.95) * st.handling * (1 - 0.3 * Math.min(1, Math.abs(vf) / 70));
  c.h += inp.steer * turn * clamp(vf / 10, -1, 1) * dt;
  const sh2 = Math.sin(c.h), ch2 = Math.cos(c.h);
  c.vx = sh2 * vf + ch2 * vl; c.vz = ch2 * vf - sh2 * vl;
  c.x += c.vx * dt; c.z += c.vz * dt; c.vf = vf; c.vl = vl;
  c.steerVis += (inp.steer - c.steerVis) * Math.min(1, 10 * dt);
  collideWorld(c);
}
// After a ramp on the main road, steer the car in the air so it follows the track and lands on it
function airControl(c, inp, dt){
  const sp = Math.hypot(c.vx, c.vz);
  if (sp < 1) return;
  let dir = Math.atan2(c.vx, c.vz);
  if (c.airRamp && c.airRamp.track) {
    const s = S[c.idx], off = (c.x - s.x) * -s.tz + (c.z - s.z) * s.tx;
    const want = Math.atan2(s.tx, s.tz) + clamp(off * 0.05, -0.45, 0.45);
    dir += clamp(wrapAngle(want - dir), -1.8 * dt, 1.8 * dt);
  }
  dir += (inp.steer || 0) * 0.7 * dt;
  c.vx = Math.sin(dir) * sp; c.vz = Math.cos(dir) * sp;
  c.h += wrapAngle(dir - c.h) * Math.min(1, 6 * dt);
}
function updateHeight(c, dt){
  let groundY = 0, hit = null;
  for (const r of MAP.ramps) {
    const s = (c.x - r.x) * r.dx + (c.z - r.z) * r.dz, l = (c.x - r.x) * -r.dz + (c.z - r.z) * r.dx;
    if (s >= 0 && s <= r.len && Math.abs(l) <= r.w / 2) { const gy = r.h * s / r.len; if (gy > groundY) { groundY = gy; hit = r; } }
  }
  if (c.air) {
    c.vy -= GRAVITY * dt; c.y += c.vy * dt;
    if (c.y <= groundY) { c.y = groundY; c.air = false; if (c.vy < -12 && c.player) { shake = Math.min(0.8, -c.vy / 40); blip(120, 60, 0.12, 0.15, 'sawtooth'); } c.vy = 0; }
    return;
  }
  if (hit) { c.y = groundY; c.lastRamp = hit; return; }
  if (c.lastRamp) {
    const r = c.lastRamp, along = c.vx * r.dx + c.vz * r.dz;
    c.vy = along > 5 && c.y > r.h * 0.6 ? Math.min(along, 46) * r.h / r.len : 0;   // capped so fast cars don't fly miles
    c.airRamp = r;
    c.air = c.y > 0.2 || c.vy > 0; c.lastRamp = null;
    if (c.air && c.player && c.vy > 0) blip(300, 700, 0.2, 0.08, 'triangle');
    return;
  }
  c.y = 0;
}
function collideWorld(c){
  const R = 2.3;
  for (const s of MAP.solids) {
    if (c.y > s.h) continue;
    const cx = clamp(c.x, s.minX, s.maxX), cz = clamp(c.z, s.minZ, s.maxZ);
    const dx = c.x - cx, dz = c.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    let nx, nz; const d = Math.sqrt(d2);
    if (d < 1e-4) {
      const opts = [[c.x - s.minX, -1, 0], [s.maxX - c.x, 1, 0], [c.z - s.minZ, 0, -1], [s.maxZ - c.z, 0, 1]].sort((a, b) => a[0] - b[0]);
      nx = opts[0][1]; nz = opts[0][2];
      if (nx) c.x = (nx > 0 ? s.maxX : s.minX) + nx * R; else c.z = (nz > 0 ? s.maxZ : s.minZ) + nz * R;
    } else { nx = dx / d; nz = dz / d; c.x = cx + nx * R; c.z = cz + nz * R; }
    hitWall(c, nx, nz);
  }
  for (const t of MAP.circles) {
    if (c.y > 6) continue;
    const dx = c.x - t.x, dz = c.z - t.z, rr = R + t.r;
    if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
    const d = Math.hypot(dx, dz); if (d >= rr || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d; c.x = t.x + nx * rr; c.z = t.z + nz * rr; hitWall(c, nx, nz);
  }
  const E = MAP.edge;
  if (c.x > E) { c.x = E; hitWall(c, -1, 0); } if (c.x < -E) { c.x = -E; hitWall(c, 1, 0); }
  if (c.z > E) { c.z = E; hitWall(c, 0, -1); } if (c.z < -E) { c.z = -E; hitWall(c, 0, 1); }
}
function hitWall(c, nx, nz){
  const vn = c.vx * nx + c.vz * nz;
  if (vn >= 0) return;
  c.vx -= nx * vn * 1.35; c.vz -= nz * vn * 1.35; c.vx *= 0.85; c.vz *= 0.85;
  if (c.player && vn < -12) { shake = Math.min(1, -vn / 40); blip(140, 60, 0.15, 0.18, 'sawtooth'); }
}
function collideCars(){
  for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) {
    const a = racers[i], b = racers[j];
    if (Math.abs(a.y - b.y) > 2) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > 4.4 || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, ma = a.spec.weight, mb = b.spec.weight, push = 4.4 - d;
    const fa = mb / (ma + mb), fb = ma / (ma + mb);
    a.x -= nx * push * fa; a.z -= nz * push * fa; b.x += nx * push * fb; b.z += nz * push * fb;
    const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (rel < 0) { const j = rel * 1.8 / (1 / ma + 1 / mb); a.vx += nx * j / ma; a.vz += nz * j / ma; b.vx -= nx * j / mb; b.vz -= nz * j / mb;
      if ((a.player || b.player) && rel < -8) { shake = Math.min(1, -rel / 30); blip(220, 80, 0.12, 0.15, 'sawtooth'); } }
  }
}

// ---------- race logic ----------
function checkLaps(c){
  const before = c.lapShown || 0, now = lapsDone(c);
  if (c.dist >= MAP.total * RACE_SETTINGS.laps) {
    c.finished = true; c.finishTime = raceTime; c.place = racers.filter(r => r.finished).length;
    if (c.player) finishRace();
    return;
  }
  if (c.player && now > before) {
    const lap = now + 1; blip(660, 990, 0.12, 0.08);
    showMsg(lap === RACE_SETTINGS.laps ? 'Final lap!' : 'Lap ' + lap, 1200);
  }
  c.lapShown = Math.max(before, now);
}
function splash(c){
  if (c.player) { showMsg('Splash!', 900); blip(400, 90, 0.35, 0.15, 'triangle'); shake = 0.5; }
  resetCar(c);
}
function resetCar(c){
  const s = S[c.idx];
  c.x = s.x; c.z = s.z; c.h = Math.atan2(s.tx, s.tz); c.vx = c.vz = 0; c.y = 0; c.vy = 0; c.air = false; c.lastRamp = null;
}
function aiInput(c, dt){
  const speed = Math.hypot(c.vx, c.vz);
  const look = Math.round((10 + speed * 0.35) / MAP.ds);
  const t = S[(c.idx + look) % N];
  const tx = t.x - t.tz * c.lane, tz = t.z + t.tx * c.lane;
  const diff = wrapAngle(Math.atan2(tx - c.x, tz - c.z) - c.h);
  // slow down for bends coming up
  // look further ahead the faster we go, and brake for the sharpest bend coming up
  const now = S[c.idx], reach = 24 + speed * 1.1;
  let bend = 0;
  for (let d = 12; d <= reach; d += 12) {
    const a = S[(c.idx + Math.round(d / MAP.ds)) % N], b = S[(c.idx + Math.round((d + 24) / MAP.ds)) % N];
    const turn = Math.acos(clamp(a.tx * b.tx + a.tz * b.tz, -1, 1)) * (d < 40 ? 1 : 40 / d + 0.35);
    bend = Math.max(bend, turn, d < 40 ? Math.acos(clamp(now.tx * a.tx + now.tz * a.tz, -1, 1)) : 0);
  }
  const want = RACE_SETTINGS.topSpeed * c.spec.speed * c.topMul * (1 - clamp((bend - 0.2) * 0.8, 0, 0.5)) * (c.spec.handling > 1 ? 1.04 : 1);
  const inp = { gas: speed < want + 2, brake: speed > want + 10, hand: false, steer: clamp(diff * 2.4, -1, 1) };
  if (c.reverseT > 0) { c.reverseT -= dt; return { gas: false, brake: true, hand: false, steer: -inp.steer }; }
  if (speed < 3 && !c.air) { c.stuck += dt; if (c.stuck > 1.2) { c.stuck = 0; c.reverseT = 0.9; c.stuckCount = (c.stuckCount || 0) + 1; } } else c.stuck = 0;
  if (speed > 20) c.stuckCount = 0;
  if (c.stuckCount >= 3) { c.stuckCount = 0; resetCar(c); }   // properly wedged: put it back on the road
  // rubber-banding keeps the race close
  const gap = progress(player) - progress(c);
  c.topMul = c.skill * (1 + clamp(gap * 0.0012, -0.1, 0.15));
  return inp;
}

// ---------- HUD ----------
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
let msgTimer = 0;
function showMsg(t, ms){ $('msg').textContent = t; $('msg').classList.add('show'); clearTimeout(msgTimer); if (ms) msgTimer = setTimeout(() => $('msg').classList.remove('show'), ms); }
(function(){ const n = COIN_SETTINGS.coinsForFullBoost, t = $('ticks');
  for (let i = 1; i < n; i++) { const d = document.createElement('div'); d.style.cssText = `position:absolute;top:0;bottom:0;left:${i / n * 100}%;width:2px;background:rgba(20,22,58,.55)`; t.appendChild(d); } })();
const mctx = $('map').getContext('2d');
const mapBg = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 264; const g = c.getContext('2d');
  const W = 264, half = MAP_LAYOUT.size + 10, s = W / (half * 2), P = (x, z) => [(x + half) * s, (z + half) * s];
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = 'rgba(47,143,216,.75)'; MAP.water.forEach(w => { const [x, z] = P(Math.max(w.minX, -half), Math.max(w.minZ, -half)); g.fillRect(x, z, (Math.min(w.maxX, half) - Math.max(w.minX, -half)) * s, (Math.min(w.maxZ, half) - Math.max(w.minZ, -half)) * s); });
  g.fillStyle = 'rgba(255,255,255,.12)'; MAP.solids.forEach(b => { const [x, z] = P(b.minX, b.minZ); g.fillRect(x, z, (b.maxX - b.minX) * s, (b.maxZ - b.minZ) * s); });
  g.strokeStyle = 'rgba(201,162,107,.8)'; g.lineWidth = 4;
  MAP.shortcuts.forEach(sc => { g.beginPath(); sc.samples.forEach((p, i) => i ? g.lineTo(...P(p.x, p.z)) : g.moveTo(...P(p.x, p.z))); g.stroke(); });
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 7; g.beginPath();
  S.forEach((p, i) => i ? g.lineTo(...P(p.x, p.z)) : g.moveTo(...P(p.x, p.z))); g.closePath(); g.stroke();
  const [fx, fz] = P(S[0].x, S[0].z); g.fillStyle = '#ffffff'; g.fillRect(fx - 5, fz - 5, 10, 10);
  return { c, P };
})();
function drawMap(){
  mctx.clearRect(0, 0, 264, 264); mctx.drawImage(mapBg.c, 0, 0);
  racers.forEach(c => {
    const [x, z] = mapBg.P(c.x, c.z); mctx.fillStyle = c.color; mctx.strokeStyle = '#14163a'; mctx.lineWidth = 3;
    if (c.player) { mctx.save(); mctx.translate(x, z); mctx.rotate(-c.h + Math.PI); mctx.beginPath(); mctx.moveTo(0, -12); mctx.lineTo(9, 9); mctx.lineTo(-9, 9); mctx.closePath(); mctx.stroke(); mctx.fill(); mctx.restore(); }
    else { mctx.beginPath(); mctx.arc(x, z, 7, 0, 7); mctx.stroke(); mctx.fill(); }
  });
}
function updateHud(){
  const order = racers.slice().sort((a, b) => progress(b) - progress(a));
  const place = player.finished ? player.place : order.indexOf(player) + 1;
  $('pos').innerHTML = ord(place) + `<small>/${racers.length}</small>`;
  $('lap').textContent = clamp(lapsDone(player) + 1, 1, RACE_SETTINGS.laps) + '/' + RACE_SETTINGS.laps;
  $('time').textContent = fmt(player.finished ? player.finishTime : raceTime);
  $('fill').style.width = (boostMeter / COIN_SETTINGS.coinsForFullBoost * 100) + '%';
  $('boost').classList.toggle('on', player.boosting);
  drawMap();
}
function checkStuckHint(dt){
  const off = MAP.nearestFull(player.x, player.z).d > MAP.half + 6, slow = Math.hypot(player.vx, player.vz) < 6;
  player.lostT = (off && slow) || (off && player.lostT > 0) ? (player.lostT || 0) + dt : 0;
  if (player.lostT > 3) { showMsg('Press R to get back on the road', 1500); player.lostT = 0.01 - 1.5; }
}
function checkWrongWay(dt){
  const s = S[player.idx], along = player.vx * s.tx + player.vz * s.tz;
  player.wrongT = along < -6 && !player.air ? player.wrongT + dt : 0;
  if (player.wrongT > 1) { showMsg('Wrong way!', 600); player.wrongT = 0.6; }
}

// ---------- game flow ----------
let state = 'menu', raceTime = 0, countdown = 0, lastCount = 0;
function resetRace(){
  racers.forEach(c => { placeOnGrid(c); c.topMul = c.skill; c.lapShown = 0; });
  coins.forEach(k => { k.active = true; });
  boostMeter = 0; totalCoins = 0; raceTime = 0; $('coinCount').textContent = '0';
  camH = player.h; camPos.set(player.x - Math.sin(camH) * 11, 5.2, player.z - Math.cos(camH) * 11);
}
function startRace(){
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  savePref('coinrush-car', myCar);
  assignCars(); resetRace();
  $('menu').hidden = true; $('results').hidden = true; $('garage').hidden = true; $('driverSelect').hidden = true; document.body.classList.remove('in-garage');
  if (driverPreview) { scene.remove(driverPreview); driverPreview = null; }
  state = 'countdown'; countdown = 3.5; lastCount = 0;
}

// ---------- garage ----------
// ---------- driver select ----------
let driverPreview = null;
function showDriverPreview(){
  if (driverPreview) scene.remove(driverPreview);
  driverPreview = buildCharacter(myCar.driver, 'standing'); driverPreview.scale.setScalar(1.6);
  driverPreview.position.set(player.x, 0, player.z); driverPreview.rotation.y = player.h; scene.add(driverPreview);
}
function openDriver(){
  state = 'driver';
  $('menu').hidden = true; $('results').hidden = true; $('garage').hidden = true; $('driverSelect').hidden = false; document.body.classList.add('in-garage');
  resetRace();
  racers.forEach(c => { c.root.visible = false; c.shadow.visible = false; });
  showDriverPreview(); updateDriver(); $('toCarBtn').focus();
}
function stepDriver(dir){
  const i = CHARACTERS.findIndex(c => c.id === myCar.driver);
  myCar.driver = CHARACTERS[(i + dir + CHARACTERS.length) % CHARACTERS.length].id;
  showDriverPreview(); updateDriver();
}
function updateDriver(){
  const ch = charById(myCar.driver), i = CHARACTERS.indexOf(ch);
  $('drvIndex').textContent = `${i + 1} / ${CHARACTERS.length}`; $('drvName').textContent = ch.name; $('drvBlurb').textContent = ch.blurb;
}
$('prevDrv').addEventListener('click', () => stepDriver(-1));
$('nextDrv').addEventListener('click', () => stepDriver(1));
$('toCarBtn').addEventListener('click', openGarage);
$('changeDriverBtn').addEventListener('click', openDriver);
addEventListener('keydown', e => {
  if (state !== 'driver') return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') stepDriver(-1);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') stepDriver(1);
});

function openGarage(){
  state = 'garage';
  if (driverPreview) { scene.remove(driverPreview); driverPreview = null; }
  $('menu').hidden = true; $('results').hidden = true; $('driverSelect').hidden = true; $('garage').hidden = false; document.body.classList.add('in-garage');
  setCarModel(player, myCar.id, myCar.paint, myCar.rim, myCar.driver); resetRace();
  racers.forEach(c => { const v = c.player; c.root.visible = v; c.shadow.visible = v; });
  updateGarage(); $('raceBtn').focus();
}
function stepCar(dir){
  const i = CARS.findIndex(c => c.id === myCar.id);
  myCar.id = CARS[(i + dir + CARS.length) % CARS.length].id;
  setCarModel(player, myCar.id, myCar.paint, myCar.rim, myCar.driver); placeOnGrid(player); updateGarage();
}
const STAT_ROWS = [['Top speed', 'speed', 0.85, 1.2], ['Acceleration', 'accel', 0.85, 1.2], ['Handling', 'handling', 0.8, 1.25], ['Weight', 'weight', 0.7, 1.8], ['Boost', 'boost', 0.9, 1.25]];
function updateGarage(){
  const spec = carById(myCar.id), i = CARS.indexOf(spec);
  $('carIndex').textContent = `${i + 1} / ${CARS.length}`;
  $('carName').textContent = spec.name;
  $('carBlurb').textContent = spec.blurb + (spec.offroad ? ' Off-road specialist.' : '');
  $('carStats').innerHTML = STAT_ROWS.map(([label, key, lo, hi]) => {
    const v = spec[key] || 1, pct = Math.round(clamp((v - lo) / (hi - lo), 0.06, 1) * 100);
    return `<div class="stat-row"><span>${label}</span><div class="stat-bar"><div style="width:${pct}%"></div></div></div>`;
  }).join('');
  $('paints').innerHTML = PAINT_COLORS.map(c => `<button class="swatch${c === myCar.paint ? ' on' : ''}" data-paint="${c}" style="background:${c}" aria-label="Paint ${c}"></button>`).join('');
  $('rims').innerHTML = Object.entries(RIM_COLORS).map(([n, c]) => `<button class="swatch rim${n === myCar.rim ? ' on' : ''}" data-rim="${n}" style="background:${c}" aria-label="${n} wheels" title="${n}"></button>`).join('');
}
$('paints').addEventListener('click', e => { const b = e.target.closest('[data-paint]'); if (!b) return; myCar.paint = b.dataset.paint; setCarModel(player, myCar.id, myCar.paint, myCar.rim, myCar.driver); updateGarage(); });
$('rims').addEventListener('click', e => { const b = e.target.closest('[data-rim]'); if (!b) return; myCar.rim = b.dataset.rim; setCarModel(player, myCar.id, myCar.paint, myCar.rim, myCar.driver); updateGarage(); });
$('prevCar').addEventListener('click', () => stepCar(-1));
$('nextCar').addEventListener('click', () => stepCar(1));
$('raceBtn').addEventListener('click', startRace);
$('changeCarBtn').addEventListener('click', openGarage);
addEventListener('keydown', e => {
  if (state !== 'garage') return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') stepCar(-1);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') stepCar(1);
  if (e.code === 'Enter' && document.activeElement === document.body) startRace();
});
function finishRace(){
  state = 'finished';
  setTimeout(() => {
    const order = racers.slice().sort((a, b) => progress(b) - progress(a));
    $('resTitle').textContent = player.place === 1 ? '1st place!' : ord(player.place) + ' place';
    $('resSub').textContent = `Finished in ${fmt(player.finishTime)} with ${totalCoins} ${COIN_SETTINGS.name || 'pickups'} collected.`;
    $('resTable').innerHTML = order.map((c, i) => `<tr class="${c.player ? 'me' : ''}"><td>${ord(i + 1)}</td><td><span class="dot" style="background:${c.color}"></span>${c.player && PICK_DRIVER ? `You <small style="opacity:.7">(${charById(c.driver).name})</small>` : c.name}</td><td>${c.finished ? fmt(c.finishTime) : 'Still racing'}</td></tr>`).join('');
    $('results').hidden = false; $('againBtn').focus();
  }, 1600);
  showMsg(player.place === 1 ? 'Winner!' : 'Finish!', 1600);
}
const PICK_DRIVER = CHARACTERS.length > 1;   // only show the driver screen once there's more than one character
if (!PICK_DRIVER) { $('changeDriverBtn').hidden = true; $('startBtn').textContent = 'Choose your car'; }
$('startBtn').addEventListener('click', () => (PICK_DRIVER ? openDriver() : openGarage()));
$('againBtn').addEventListener('click', startRace);

// ---------- loop ----------
let camH = 0, camY = 0, garageView = false, last = performance.now();
const camPos = new THREE.Vector3();
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;

  if (state === 'countdown') {
    countdown -= dt; const n = Math.ceil(countdown - 0.5);
    if (n !== lastCount) { lastCount = n; if (n > 0 && n <= 3) { showMsg(String(n)); blip(440, 440, 0.15, 0.1); } }
    if (countdown <= 0.5) { state = 'race'; showMsg('GO!', 700); blip(880, 880, 0.3, 0.12); }
  }
  if (state === 'race' || state === 'finished') {
    raceTime += dt;
    racers.forEach(c => {
      let inp;
      if (c.player && state === 'race') {
        inp = { gas: !!keys.gas, brake: !!keys.brake, hand: !!keys.hand, steer: (keys.left ? 1 : 0) - (keys.right ? 1 : 0) };
        c.topMul = 1;
        c.boosting = !!keys.boost && boostMeter > 0;
        if (c.boosting) { inp.gas = true; boostMeter = Math.max(0, boostMeter - COIN_SETTINGS.coinsForFullBoost / COIN_SETTINGS.boostSeconds * dt); }
      } else if (c.player) { inp = { gas: false, brake: true, hand: false, steer: 0 }; c.boosting = false; }
      else inp = aiInput(c, dt);
      drive(c, inp, dt);
      updateHeight(c, dt);
    });
    collideCars();
    racers.forEach(c => { updateProgress(c); if (!c.finished) checkLaps(c); });
    if (state === 'race') { checkWrongWay(dt); checkStuckHint(dt); }
    coins.forEach(k => {
      if (!k.active) { if (raceTime > k.back) { k.active = true; } return; }
      if (Math.abs(k.y - (player.y + 1.3)) < 2.6 && Math.hypot(k.x - player.x, k.z - player.z) < 3) {
        k.active = false; k.back = raceTime + COIN_SETTINGS.respawnSeconds;
        totalCoins++; boostMeter = Math.min(COIN_SETTINGS.coinsForFullBoost, boostMeter + COIN_SETTINGS.value);
        $('coinCount').textContent = totalCoins;
        const el = $('coins'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        blip(988, 1568, 0.09, 0.07);
      }
    });
  }

  // visuals
  updatePickups(t);
  racers.forEach(c => {
    c.root.position.set(c.x, c.y, c.z); c.root.rotation.y = c.h;
    c.shadow.position.set(c.x, 0.06, c.z); c.shadow.rotation.z = c.h;
    c.body.rotation.z = clamp((c.vl || 0) * 0.02, -0.12, 0.12);
    c.body.rotation.x = c.air ? clamp(-c.vy * 0.02, -0.35, 0.35) : clamp(-(c.vf || 0) * 0.0015, -0.05, 0.05);
    c.wheels.forEach(w => w.spin.rotation.x += (c.vf || 0) * dt / w.r);
    c.pivots.forEach(p => p.rotation.y = c.steerVis * 0.45);
    c.flames.forEach(f => { f.visible = c.boosting; f.scale.z = 0.8 + Math.random() * 0.6; });
  });

  // chase camera
  if (state === 'garage' || state === 'driver') {
    const drv = state === 'driver', a = drv ? player.h + Math.sin(t * 0.6) * 0.7 : t * 0.35 + 2.4;
    if (drv && driverPreview) driverPreview.rotation.y = player.h + Math.sin(t * 0.8) * 0.5;
    // frame the car (or driver) in the space beside or above the panel
    const card = document.querySelector(drv ? '#driverSelect .garage-card' : '#garage .garage-card').getBoundingClientRect(), side = card.right < innerWidth * 0.55 && card.height < innerHeight * 0.95;
    const availW = side ? innerWidth - card.right : innerWidth, availH = side ? innerHeight : innerHeight - card.height - 16;
    const dist = Math.max(9, 9 * 300 / Math.max(120, availH), 9 * 520 / Math.max(200, availW) * (innerHeight / Math.max(200, availH)) * 0.55) * (drv ? (side ? 0.62 : 0.85) : 1);
    camera.position.set(player.x + Math.sin(a) * dist, drv ? 2.4 : 3.2, player.z + Math.cos(a) * dist);
    camera.lookAt(player.x, drv ? 1.7 : 0.7, player.z);
    if (side) camera.setViewOffset(innerWidth, innerHeight, -card.right / 2, 0, innerWidth, innerHeight);
    else camera.setViewOffset(innerWidth, innerHeight, 0, (card.height + 16) / 2, innerWidth, innerHeight);
    garageView = true;
    if (Math.abs(camera.fov - 55) > 0.1) { camera.fov = 55; camera.updateProjectionMatrix(); }
    MAP.sky.position.copy(camera.position); MAP.followSun(player.x, player.z);
    updateHud(); renderer.render(scene, camera); requestAnimationFrame(frame); return;
  }
  if (garageView) { camera.clearViewOffset(); garageView = false; }
  camH += wrapAngle(player.h - camH) * Math.min(1, 5 * dt);
  const back = 11;
  camY += (player.y - camY) * Math.min(1, 10 * dt);   // camera rises with the car so it doesn't look like it shrinks
  const want = new THREE.Vector3(player.x - Math.sin(camH) * back, 5.2 + camY, player.z - Math.cos(camH) * back);
  camPos.lerp(want, Math.min(1, 8 * dt));
  shake *= Math.exp(-6 * dt);
  camera.position.set(camPos.x + (Math.random() - 0.5) * shake, camPos.y + (Math.random() - 0.5) * shake, camPos.z + (Math.random() - 0.5) * shake);
  camera.lookAt(player.x + Math.sin(camH) * 5, 1.6 + camY, player.z + Math.cos(camH) * 5);
  const fov = player.boosting ? 76 : 70;
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, 4 * dt); camera.updateProjectionMatrix(); }

  MAP.sky.position.copy(camera.position); MAP.followSun(player.x, player.z);
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
resetRace();
requestAnimationFrame(frame);
