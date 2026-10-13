// Coin Rush game code: driving, AI, coins, HUD and race flow.
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = rng(42);

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#7fc8f8');
scene.fog = new THREE.Fog('#7fc8f8', 140, 340);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 600);
scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x5d8a4a, 0.95));
const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(60, 100, 40); scene.add(sun);
function resize(){ const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const mat = c => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));

// ---------- town ----------
const ROADS = [-120, -60, 0, 60, 120], BLOCKS = [-90, -30, 30, 90], EDGE = 129;
const solids = [];
const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat('#7cc36a'));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const roadMat = mat('#4a4e69');
ROADS.forEach(r => {
  const a = new THREE.Mesh(new THREE.PlaneGeometry(260, 20), roadMat); a.rotation.x = -Math.PI / 2; a.position.set(0, 0.02, r); scene.add(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(20, 260), roadMat); b.rotation.x = -Math.PI / 2; b.position.set(r, 0.02, 0); scene.add(b);
});
// lane dashes
const dashes = [];
ROADS.forEach(r => { for (let t = -126; t <= 126; t += 8) { if (ROADS.some(R => Math.abs(t - R) < 12)) continue; dashes.push([t, r, 0], [r, t, 1]); } });
const dashMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 3.2), new THREE.MeshBasicMaterial({ color: '#f4f1de' }), dashes.length);
const dm = new THREE.Object3D();
dashes.forEach(([x, z, v], i) => { dm.position.set(x, 0.04, z); dm.rotation.set(-Math.PI / 2, 0, v ? 0 : Math.PI / 2); dm.updateMatrix(); dashMesh.setMatrixAt(i, dm.matrix); });
scene.add(dashMesh);
const BUILD_COLORS = ['#f6a5c0', '#ffd27f', '#9ad1d4', '#c3b1e1', '#f7b267', '#a8e6a1', '#ef8a62', '#e9d8a6'];
function tree(x, z, s = 1){
  const t = box(0.8 * s, 3 * s, 0.8 * s, '#8d5b3e'); t.position.set(x, 1.5 * s, z); scene.add(t);
  const c = new THREE.Mesh(new THREE.ConeGeometry(2.6 * s, 6 * s, 7), mat('#3f9b4f')); c.position.set(x, 5.5 * s, z); scene.add(c);
}
BLOCKS.forEach(bx => BLOCKS.forEach(bz => {
  const walk = box(40, 0.3, 40, '#d9d4c7'); walk.position.set(bx, 0.15, bz); scene.add(walk);
  solids.push({ minX: bx - 20, maxX: bx + 20, minZ: bz - 20, maxZ: bz + 20 });
  const park = (bx === 30 && bz === -30) || (bx === -30 && bz === 90);
  if (park) {
    const g = box(36, 0.4, 36, '#62b357'); g.position.set(bx, 0.2, bz); scene.add(g);
    for (let i = 0; i < 7; i++) tree(bx - 14 + rand() * 28, bz - 14 + rand() * 28, 0.8 + rand() * 0.5);
    return;
  }
  [-1, 1].forEach(i => [-1, 1].forEach(j => {
    const w = 13 + rand() * 4, d = 13 + rand() * 4, h = 8 + rand() * 24;
    const col = BUILD_COLORS[Math.floor(rand() * BUILD_COLORS.length)];
    const b = box(w, h, d, col); b.position.set(bx + i * 9.5, 0.3 + h / 2, bz + j * 9.5); scene.add(b);
    const roof = box(w + 0.6, 0.8, d + 0.6, new THREE.Color(col).multiplyScalar(0.72)); roof.position.set(b.position.x, 0.3 + h + 0.4, b.position.z); scene.add(roof);
  }));
}));
[[0, -132, 266, 1], [0, 132, 266, 1], [-132, 0, 1, 266], [132, 0, 1, 266]].forEach(([x, z, w, d]) => { const f = box(w, 1.2, d, '#e63946'); f.position.set(x, 0.6, z); scene.add(f); });
for (let i = 0; i < 90; i++) { const a = rand() * Math.PI * 2, r = 145 + rand() * 70; tree(Math.cos(a) * r, Math.sin(a) * r, 0.9 + rand() * 0.8); }

// ---------- race route ----------
const CP = [[-60, -120], [60, -120], [60, -60], [120, -60], [120, 120], [0, 120], [0, 0], [-120, 0], [-120, -120]];
const N = CP.length, CP_RADIUS = 13;
// start line
(function(){
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 16, y * 16, 16, 16); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  m.rotation.x = -Math.PI / 2; m.position.set(CP[0][0], 0.05, CP[0][1]); scene.add(m);
})();
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 40, 28, 1, true),
  new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
beacon.position.y = 20; scene.add(beacon);

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
for (let i = 0; i < N; i++) {
  const [ax, az] = CP[i], [bx, bz] = CP[(i + 1) % N];
  const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
  for (let s = 10; s < len - 10; s += COIN_SETTINGS.spacing) {
    const off = Math.sin((s + i * 17) * 0.09) * 5.5;
    const m = new THREE.Mesh(coinGeo, coinMat);
    const x = ax + ux * s - uz * off, z = az + uz * s + ux * off;
    m.position.set(x, 1.6, z); scene.add(m);
    coins.push({ m, x, z, active: true, back: 0, phase: rand() * 6 });
  }
}

// ---------- cars ----------
const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 14); wheelGeo.rotateZ(Math.PI / 2);
const wheelMat = mat('#22223b');
function makeCar(color){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 1.5, 1); shadow.position.y = 0.06; root.add(shadow);
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
  return { root, body, wheels, pivots, flames };
}
const racers = RACERS.map((r, i) => {
  const car = makeCar(r.color);
  return Object.assign({ name: r.name, color: r.color, player: !!r.player, skill: r.skill || 1, slot: i, lane: (i % 2 ? 3 : -3) + (rand() - 0.5) * 2 }, car);
});
const player = racers.find(r => r.player);

function placeOnGrid(c){
  c.x = -76 - Math.floor(c.slot / 2) * 10; c.z = -120 + (c.slot % 2 ? 4.5 : -4.5);
  c.h = Math.PI / 2; c.vx = c.vz = 0; c.vf = 0; c.steerVis = 0;
  c.next = 1; c.passed = 0; c.finished = false; c.finishTime = 0; c.stuck = 0; c.reverseT = 0; c.boosting = false;
}

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
  const sh = Math.sin(c.h), ch = Math.cos(c.h);
  let vf = c.vx * sh + c.vz * ch, vl = c.vx * ch - c.vz * sh;
  const top = RACE_SETTINGS.topSpeed * c.topMul * (c.boosting ? 1 + COIN_SETTINGS.boostPower : 1);
  if (inp.gas) vf += 30 * (c.boosting ? 1.8 : 1) * dt;
  if (inp.brake) vf -= (vf > 0 ? 48 : 18) * dt;
  if (!inp.gas && !inp.brake) vf *= 1 - 0.7 * dt;
  if (vf > top) vf -= (vf - top) * 2.5 * dt;
  if (vf < -16) vf = -16;
  vl *= Math.exp(-(inp.hand ? 1.4 : 7.5) * dt);
  if (inp.hand) vf *= 1 - 0.5 * dt;
  const turn = (inp.hand ? 2.7 : 1.95) * (1 - 0.3 * Math.min(1, Math.abs(vf) / 70));
  c.h += inp.steer * turn * clamp(vf / 10, -1, 1) * dt;
  const sh2 = Math.sin(c.h), ch2 = Math.cos(c.h);
  c.vx = sh2 * vf + ch2 * vl; c.vz = ch2 * vf - sh2 * vl;
  c.x += c.vx * dt; c.z += c.vz * dt; c.vf = vf; c.vl = vl;
  c.steerVis += (inp.steer - c.steerVis) * Math.min(1, 10 * dt);
  collideWorld(c);
}
function collideWorld(c){
  const R = 2.3;
  for (const s of solids) {
    const cx = clamp(c.x, s.minX, s.maxX), cz = clamp(c.z, s.minZ, s.maxZ);
    let dx = c.x - cx, dz = c.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    let nx, nz, d = Math.sqrt(d2);
    if (d < 1e-4) { // inside: push out along the shallowest side
      const opts = [[c.x - s.minX, -1, 0], [s.maxX - c.x, 1, 0], [c.z - s.minZ, 0, -1], [s.maxZ - c.z, 0, 1]].sort((a, b) => a[0] - b[0]);
      nx = opts[0][1]; nz = opts[0][2]; d = 0;
      c.x = nx ? (nx > 0 ? s.maxX : s.minX) + nx * R : c.x; c.z = nz ? (nz > 0 ? s.maxZ : s.minZ) + nz * R : c.z;
    } else { nx = dx / d; nz = dz / d; c.x = cx + nx * R; c.z = cz + nz * R; }
    hitWall(c, nx, nz);
  }
  if (c.x > EDGE) { c.x = EDGE; hitWall(c, -1, 0); } if (c.x < -EDGE) { c.x = -EDGE; hitWall(c, 1, 0); }
  if (c.z > EDGE) { c.z = EDGE; hitWall(c, 0, -1); } if (c.z < -EDGE) { c.z = -EDGE; hitWall(c, 0, 1); }
}
function hitWall(c, nx, nz){
  const vn = c.vx * nx + c.vz * nz;
  if (vn >= 0) return;
  c.vx -= nx * vn * 1.35; c.vz -= nz * vn * 1.35; c.vx *= 0.85; c.vz *= 0.85;
  if (c.player && vn < -12) { shake = Math.min(1, -vn / 40); blip(140, 60, 0.15, 0.18, 'sawtooth'); }
}
function collideCars(){
  for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) {
    const a = racers[i], b = racers[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > 4.4 || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, push = (4.4 - d) / 2;
    a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
    const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (rel < 0) { const imp = rel * 0.9; a.vx += nx * imp; a.vz += nz * imp; b.vx -= nx * imp; b.vz -= nz * imp;
      if ((a.player || b.player) && rel < -8) { shake = Math.min(1, -rel / 30); blip(220, 80, 0.12, 0.15, 'sawtooth'); } }
  }
}

// ---------- race logic ----------
function progress(c){
  if (c.finished) return 1e6 - c.finishTime;
  const [px, pz] = CP[(c.next - 1 + N) % N], [nx, nz] = CP[c.next];
  const seg = Math.hypot(nx - px, nz - pz), d = Math.hypot(nx - c.x, nz - c.z);
  return c.passed + 1 - clamp(d / seg, 0, 1);
}
function checkpoints(c){
  const [nx, nz] = CP[c.next];
  if (Math.hypot(nx - c.x, nz - c.z) > CP_RADIUS) return;
  c.passed++; c.next = (c.next + 1) % N;
  if (c.passed >= N * RACE_SETTINGS.laps) {
    c.finished = true; c.finishTime = raceTime; c.place = racers.filter(r => r.finished).length;
    if (c.player) finishRace();
    return;
  }
  if (c.player) {
    blip(660, 990, 0.08, 0.08);
    if (c.next === 1) { const lap = Math.floor(c.passed / N) + 1; showMsg(lap === RACE_SETTINGS.laps ? 'Final lap!' : 'Lap ' + lap, 1200); }
  }
}
function resetCar(c){
  const [px, pz] = CP[(c.next - 1 + N) % N], [nx, nz] = CP[c.next];
  c.x = px; c.z = pz; c.h = Math.atan2(nx - px, nz - pz); c.vx = c.vz = 0;
}
function aiInput(c, dt){
  const prev = CP[(c.next - 1 + N) % N], tgt = CP[c.next];
  const sx = tgt[0] - prev[0], sz = tgt[1] - prev[1], sl = Math.hypot(sx, sz) || 1;
  const tx = tgt[0] - (sz / sl) * c.lane, tz = tgt[1] + (sx / sl) * c.lane;
  const dx = tx - c.x, dz = tz - c.z, dist = Math.hypot(dx, dz);
  const diff = wrapAngle(Math.atan2(dx, dz) - c.h);
  const speed = Math.hypot(c.vx, c.vz);
  const inp = { gas: true, brake: false, hand: false, steer: clamp(diff * 2.4, -1, 1) };
  if (Math.abs(diff) > 0.7 && speed > 22) { inp.gas = false; inp.brake = speed > 30; }
  if (dist < 24 && speed > 34) { inp.gas = false; inp.brake = speed > 40; }
  // stuck? back up and try again
  if (c.reverseT > 0) { c.reverseT -= dt; return { gas: false, brake: true, hand: false, steer: -inp.steer }; }
  if (speed < 3) { c.stuck += dt; if (c.stuck > 1.2) { c.stuck = 0; c.reverseT = 0.9; } } else c.stuck = 0;
  // rubber-banding keeps the race close
  const gap = progress(player) - progress(c);
  c.topMul = c.skill * (1 + clamp(gap * 0.05, -0.1, 0.14));
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
function drawMap(){
  const W = 264, s = W / 280, P = (x, z) => [(x + 140) * s, (z + 140) * s];
  mctx.clearRect(0, 0, W, W);
  mctx.lineCap = 'round'; mctx.lineJoin = 'round';
  mctx.strokeStyle = 'rgba(255,255,255,.18)'; mctx.lineWidth = 9;
  ROADS.forEach(r => { mctx.beginPath(); mctx.moveTo(...P(-130, r)); mctx.lineTo(...P(130, r)); mctx.moveTo(...P(r, -130)); mctx.lineTo(...P(r, 130)); mctx.stroke(); });
  mctx.strokeStyle = 'rgba(255,255,255,.55)'; mctx.lineWidth = 6; mctx.beginPath();
  CP.forEach(([x, z], i) => i ? mctx.lineTo(...P(x, z)) : mctx.moveTo(...P(x, z))); mctx.closePath(); mctx.stroke();
  const [nx, nz] = P(...CP[player.next]); mctx.fillStyle = '#ffd23f'; mctx.beginPath(); mctx.arc(nx, nz, 9, 0, 7); mctx.fill();
  racers.forEach(c => {
    const [x, z] = P(c.x, c.z); mctx.fillStyle = c.color; mctx.strokeStyle = '#14163a'; mctx.lineWidth = 3;
    if (c.player) { mctx.save(); mctx.translate(x, z); mctx.rotate(-c.h + Math.PI); mctx.beginPath(); mctx.moveTo(0, -12); mctx.lineTo(9, 9); mctx.lineTo(-9, 9); mctx.closePath(); mctx.stroke(); mctx.fill(); mctx.restore(); }
    else { mctx.beginPath(); mctx.arc(x, z, 7, 0, 7); mctx.stroke(); mctx.fill(); }
  });
}
function updateHud(){
  const order = racers.slice().sort((a, b) => progress(b) - progress(a));
  const place = player.finished ? player.place : order.indexOf(player) + 1;
  $('pos').innerHTML = ord(place) + `<small>/${racers.length}</small>`;
  $('lap').textContent = Math.min(RACE_SETTINGS.laps, Math.floor(player.passed / N) + 1) + '/' + RACE_SETTINGS.laps;
  $('time').textContent = fmt(raceTime);
  $('fill').style.width = (boostMeter / COIN_SETTINGS.coinsForFullBoost * 100) + '%';
  $('boost').classList.toggle('on', player.boosting);
  const [tx, tz] = CP[player.next];
  $('arrow').style.transform = `rotate(${-wrapAngle(Math.atan2(tx - player.x, tz - player.z) - player.h)}rad)`;
  drawMap();
}

// ---------- game flow ----------
let state = 'menu', raceTime = 0, countdown = 0, lastCount = 0;
function resetRace(){
  racers.forEach(c => { placeOnGrid(c); c.topMul = c.skill; });
  coins.forEach(k => { k.active = true; k.m.visible = true; });
  boostMeter = 0; totalCoins = 0; raceTime = 0; $('coinCount').textContent = '0';
  camH = Math.PI / 2;
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
let camH = Math.PI / 2, last = performance.now();
const camPos = new THREE.Vector3(-90, 8, -120);
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;

  if (state === 'countdown') {
    countdown -= dt; const n = Math.ceil(countdown - 0.5);
    if (n !== lastCount) { lastCount = n; if (n > 0 && n <= 3) { showMsg(String(n)); blip(440, 440, 0.15, 0.1); } }
    if (countdown <= 0.5) { state = 'race'; showMsg('GO!', 700); blip(880, 880, 0.3, 0.12); }
  }
  if (state === 'race' || state === 'finished') {
    raceTime += state === 'race' ? dt : 0;
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
      if (!c.finished) checkpoints(c);
    });
    collideCars();
    // pickups
    coins.forEach(k => {
      if (!k.active) { if (raceTime > k.back) { k.active = true; k.m.visible = true; } return; }
      if (Math.hypot(k.x - player.x, k.z - player.z) < 3) {
        k.active = false; k.m.visible = false; k.back = raceTime + COIN_SETTINGS.respawnSeconds;
        totalCoins++; boostMeter = Math.min(COIN_SETTINGS.coinsForFullBoost, boostMeter + COIN_SETTINGS.value);
        $('coinCount').textContent = totalCoins;
        const el = $('coins'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        blip(988, 1568, 0.09, 0.07);
      }
    });
  }

  // visuals
  coins.forEach(k => { if (k.active) { k.m.rotation.y = t * COIN_SETTINGS.spinSpeed + k.phase; k.m.position.y = 1.6 + Math.sin(t * 3 + k.phase) * 0.25; } });
  racers.forEach(c => {
    c.root.position.set(c.x, 0, c.z); c.root.rotation.y = c.h;
    c.body.rotation.z = clamp((c.vl || 0) * 0.02, -0.12, 0.12);
    c.body.rotation.x = clamp(-(c.vf || 0) * 0.0015, -0.05, 0.05);
    c.wheels.forEach(w => w.rotation.x += (c.vf || 0) * dt / 0.55);
    c.pivots.forEach(p => p.rotation.y = c.steerVis * 0.45);
    c.flames.forEach(f => { f.visible = c.boosting; f.scale.z = 0.8 + Math.random() * 0.6; });
  });
  const [bx, bz] = CP[player.next];
  beacon.position.x = bx; beacon.position.z = bz; beacon.material.opacity = 0.18 + Math.sin(t * 4) * 0.06;
  beacon.material.color.set(player.next === 0 ? '#ffffff' : '#ffd23f');

  // chase camera
  camH += wrapAngle(player.h - camH) * Math.min(1, 5 * dt);
  const back = player.boosting ? 12.5 : 11;
  const want = new THREE.Vector3(player.x - Math.sin(camH) * back, 5.2, player.z - Math.cos(camH) * back);
  camPos.lerp(want, Math.min(1, 8 * dt));
  shake *= Math.exp(-6 * dt);
  camera.position.set(camPos.x + (Math.random() - 0.5) * shake, camPos.y + (Math.random() - 0.5) * shake, camPos.z + (Math.random() - 0.5) * shake);
  camera.lookAt(player.x + Math.sin(camH) * 5, 1.6, player.z + Math.cos(camH) * 5);
  const fov = player.boosting ? 84 : 70;
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, 4 * dt); camera.updateProjectionMatrix(); }

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
resetRace();
requestAnimationFrame(frame);
