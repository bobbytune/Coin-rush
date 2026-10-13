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
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 800);
function resize(){ const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const MAP = buildMap(scene);
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
const coinGeo = coinGeometry();
const coinMat = new THREE.MeshStandardMaterial({ color: COIN_SETTINGS.color, emissive: COIN_SETTINGS.glowColor, emissiveIntensity: 0.35, metalness: 0.5, roughness: 0.35 });
$('coinIco').style.background = COIN_SETTINGS.color;
const coins = [];
function addCoin(x, y, z){ const m = new THREE.Mesh(coinGeo, coinMat); m.position.set(x, y, z); scene.add(m); coins.push({ m, x, y, z, active: true, back: 0, phase: rand() * 6 }); }
const nearRamp = (x, z) => MAP.ramps.some(r => { const s = (x - r.x) * r.dx + (z - r.z) * r.dz, l = (x - r.x) * -r.dz + (z - r.z) * r.dx; return s > -6 && s < r.len + 48 && Math.abs(l) < r.w / 2 + 2; });
(function placeCoins(){
  const step = Math.max(2, Math.round(COIN_SETTINGS.spacing / MAP.ds));
  for (let i = 8; i < N - 4; i += step) {
    const s = S[i], off = Math.sin(i * MAP.ds * 0.045) * (MAP.half - 4);
    const x = s.x - s.tz * off, z = s.z + s.tx * off;
    if (!nearRamp(x, z)) addCoin(x, 1.6, z);
  }
  MAP.shortcuts.forEach(sc => { for (let i = 6; i < sc.samples.length - 6; i += step) { const s = sc.samples[i]; if (!nearRamp(s.x, s.z)) addCoin(s.x, 1.6, s.z); } });
  // a trail of coins through the air after every ramp
  MAP.ramps.forEach(r => {
    const v = 46, vy = v * r.h / r.len;
    for (let t = 0.15; t < 0.8; t += 0.15) { const d = r.len + v * t, y = r.h + vy * t - 0.5 * GRAVITY * t * t + 1.3; addCoin(r.x + r.dx * d, y, r.z + r.dz * d); }
  });
})();

// ---------- cars ----------
const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 14); wheelGeo.rotateZ(Math.PI / 2);
const wheelMat = mat('#22223b');
function makeCar(color){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 1.5, 1); shadow.position.y = 0.06; scene.add(shadow);
  const hull = box(2.4, 0.9, 4.4, color); hull.position.y = 0.95; body.add(hull);
  const cab = box(2, 0.8, 2.2, '#f1faee'); cab.position.set(0, 1.8, -0.3); body.add(cab);
  const roof = box(2.05, 0.15, 2.0, color); roof.position.set(0, 2.25, -0.3); body.add(roof);
  [-0.7, 0.7].forEach(x => { const l = box(0.5, 0.3, 0.1, '#fff3b0'); l.position.set(x, 1.05, 2.22); body.add(l);
    const t = box(0.5, 0.3, 0.1, '#d62828'); t.position.set(x, 1.05, -2.22); body.add(t); });
  const wheels = [], pivots = [];
  [[-1.25, 1.4], [1.25, 1.4], [-1.25, -1.4], [1.25, -1.4]].forEach(([x, z], i) => {
    const p = new THREE.Group(); p.position.set(x, 0.55, z); body.add(p);
    const w = new THREE.Mesh(wheelGeo, wheelMat); p.add(w); wheels.push(w); if (i < 2) pivots.push(p);
  });
  const flameGeo = new THREE.ConeGeometry(0.35, 2, 10); flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb703', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [-0.6, 0.6].map(x => { const f = new THREE.Mesh(flameGeo, flameMat); f.position.set(x, 0.75, -3.2); f.visible = false; body.add(f); return f; });
  scene.add(root);
  return { root, body, wheels, pivots, flames, shadow };
}
const racers = RACERS.map((r, i) => {
  const car = makeCar(r.color);
  return Object.assign({ name: r.name, color: r.color, player: !!r.player, skill: r.skill || 1, slot: i, lane: (i % 2 ? 4 : -4) + (rand() - 0.5) * 2 }, car);
});
const player = racers.find(r => r.player);

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
  if (c.air) { c.x += c.vx * dt; c.z += c.vz * dt; collideWorld(c); return; }
  const surface = MAP.surfaceAt(c.x, c.z);
  const surfMul = surface === 'road' ? 1 : surface === 'dirt' ? MAP_LAYOUT.dirtSpeed : MAP_LAYOUT.grassSpeed;
  const sh = Math.sin(c.h), ch = Math.cos(c.h);
  let vf = c.vx * sh + c.vz * ch, vl = c.vx * ch - c.vz * sh;
  const top = RACE_SETTINGS.topSpeed * c.topMul * surfMul * (c.boosting ? 1 + COIN_SETTINGS.boostPower : 1);
  if (inp.gas) vf += 30 * (c.boosting ? 1.8 : 1) * dt;
  if (inp.brake) vf -= (vf > 0 ? 48 : 18) * dt;
  if (!inp.gas && !inp.brake) vf *= 1 - 0.7 * dt;
  if (vf > top) vf -= (vf - top) * 2.5 * dt;
  if (vf < -16) vf = -16;
  vl *= Math.exp(-(inp.hand ? 1.4 : surface === 'road' ? 7.5 : 5) * dt);
  if (inp.hand) vf *= 1 - 0.5 * dt;
  const turn = (inp.hand ? 2.7 : 1.95) * (1 - 0.3 * Math.min(1, Math.abs(vf) / 70));
  c.h += inp.steer * turn * clamp(vf / 10, -1, 1) * dt;
  const sh2 = Math.sin(c.h), ch2 = Math.cos(c.h);
  c.vx = sh2 * vf + ch2 * vl; c.vz = ch2 * vf - sh2 * vl;
  c.x += c.vx * dt; c.z += c.vz * dt; c.vf = vf; c.vl = vl;
  c.steerVis += (inp.steer - c.steerVis) * Math.min(1, 10 * dt);
  collideWorld(c);
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
    c.vy = along > 5 && c.y > r.h * 0.6 ? along * r.h / r.len : 0;
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
    const nx = dx / d, nz = dz / d, push = (4.4 - d) / 2;
    a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
    const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (rel < 0) { const imp = rel * 0.9; a.vx += nx * imp; a.vz += nz * imp; b.vx -= nx * imp; b.vz -= nz * imp;
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
  const now = S[c.idx], ahead = S[(c.idx + Math.round(36 / MAP.ds)) % N];
  const bend = Math.acos(clamp(now.tx * ahead.tx + now.tz * ahead.tz, -1, 1));
  const want = RACE_SETTINGS.topSpeed * c.topMul * (1 - clamp((bend - 0.2) * 0.8, 0, 0.5));
  const inp = { gas: speed < want + 2, brake: speed > want + 10, hand: false, steer: clamp(diff * 2.4, -1, 1) };
  if (c.reverseT > 0) { c.reverseT -= dt; return { gas: false, brake: true, hand: false, steer: -inp.steer }; }
  if (speed < 3 && !c.air) { c.stuck += dt; if (c.stuck > 1.2) { c.stuck = 0; c.reverseT = 0.9; } } else c.stuck = 0;
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
function checkWrongWay(dt){
  const s = S[player.idx], along = player.vx * s.tx + player.vz * s.tz;
  player.wrongT = along < -6 && !player.air ? player.wrongT + dt : 0;
  if (player.wrongT > 1) { showMsg('Wrong way!', 600); player.wrongT = 0.6; }
}

// ---------- game flow ----------
let state = 'menu', raceTime = 0, countdown = 0, lastCount = 0;
function resetRace(){
  racers.forEach(c => { placeOnGrid(c); c.topMul = c.skill; c.lapShown = 0; });
  coins.forEach(k => { k.active = true; k.m.visible = true; });
  boostMeter = 0; totalCoins = 0; raceTime = 0; $('coinCount').textContent = '0';
  camH = player.h; camPos.set(player.x - Math.sin(camH) * 11, 5.2, player.z - Math.cos(camH) * 11);
}
function startRace(){
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  resetRace(); $('menu').hidden = true; $('results').hidden = true;
  state = 'countdown'; countdown = 3.5; lastCount = 0;
}
function finishRace(){
  state = 'finished';
  setTimeout(() => {
    const order = racers.slice().sort((a, b) => progress(b) - progress(a));
    $('resTitle').textContent = player.place === 1 ? '1st place!' : ord(player.place) + ' place';
    $('resSub').textContent = `Finished in ${fmt(player.finishTime)} with ${totalCoins} ${COIN_SETTINGS.shape === 'coin' ? 'coins' : 'pickups'} collected.`;
    $('resTable').innerHTML = order.map((c, i) => `<tr class="${c.player ? 'me' : ''}"><td>${ord(i + 1)}</td><td><span class="dot" style="background:${c.color}"></span>${c.name}</td><td>${c.finished ? fmt(c.finishTime) : 'Still racing'}</td></tr>`).join('');
    $('results').hidden = false; $('againBtn').focus();
  }, 1600);
  showMsg(player.place === 1 ? 'Winner!' : 'Finish!', 1600);
}
$('startBtn').addEventListener('click', startRace);
$('againBtn').addEventListener('click', startRace);

// ---------- loop ----------
let camH = 0, last = performance.now();
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
    if (state === 'race') checkWrongWay(dt);
    coins.forEach(k => {
      if (!k.active) { if (raceTime > k.back) { k.active = true; k.m.visible = true; } return; }
      if (Math.abs(k.y - (player.y + 1.3)) < 2.6 && Math.hypot(k.x - player.x, k.z - player.z) < 3) {
        k.active = false; k.m.visible = false; k.back = raceTime + COIN_SETTINGS.respawnSeconds;
        totalCoins++; boostMeter = Math.min(COIN_SETTINGS.coinsForFullBoost, boostMeter + COIN_SETTINGS.value);
        $('coinCount').textContent = totalCoins;
        const el = $('coins'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        blip(988, 1568, 0.09, 0.07);
      }
    });
  }

  // visuals
  coins.forEach(k => { if (k.active) { k.m.rotation.y = t * COIN_SETTINGS.spinSpeed + k.phase; k.m.position.y = k.y + Math.sin(t * 3 + k.phase) * 0.25; } });
  racers.forEach(c => {
    c.root.position.set(c.x, c.y, c.z); c.root.rotation.y = c.h;
    c.shadow.position.set(c.x, 0.06, c.z); c.shadow.rotation.z = c.h;
    c.body.rotation.z = clamp((c.vl || 0) * 0.02, -0.12, 0.12);
    c.body.rotation.x = c.air ? clamp(-c.vy * 0.02, -0.35, 0.35) : clamp(-(c.vf || 0) * 0.0015, -0.05, 0.05);
    c.wheels.forEach(w => w.rotation.x += (c.vf || 0) * dt / 0.55);
    c.pivots.forEach(p => p.rotation.y = c.steerVis * 0.45);
    c.flames.forEach(f => { f.visible = c.boosting; f.scale.z = 0.8 + Math.random() * 0.6; });
  });

  // chase camera
  camH += wrapAngle(player.h - camH) * Math.min(1, 5 * dt);
  const back = player.boosting ? 12.5 : 11;
  const want = new THREE.Vector3(player.x - Math.sin(camH) * back, 5.2 + player.y * 0.7, player.z - Math.cos(camH) * back);
  camPos.lerp(want, Math.min(1, 8 * dt));
  shake *= Math.exp(-6 * dt);
  camera.position.set(camPos.x + (Math.random() - 0.5) * shake, camPos.y + (Math.random() - 0.5) * shake, camPos.z + (Math.random() - 0.5) * shake);
  camera.lookAt(player.x + Math.sin(camH) * 5, 1.6 + player.y * 0.8, player.z + Math.cos(camH) * 5);
  const fov = player.boosting ? 84 : 70;
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, 4 * dt); camera.updateProjectionMatrix(); }

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
resetRace();
requestAnimationFrame(frame);
