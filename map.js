// Coin Rush map: change the look (MAP_THEME) and the circuit (MAP_LAYOUT) here.

// =====================================================================
//  LOOK: colours and scenery style
// =====================================================================
const MAP_THEME = {
  sky: '#7fc8f8',            // sky and distant haze
  fogNear: 180, fogFar: 460, // where the haze starts and ends
  sunColor: '#ffffff', sunStrength: 0.75,
  skyLight: '#e8f6ff', groundLight: '#5d8a4a', ambientStrength: 0.95,
  grass: '#7cc36a',
  road: '#4a4e69',
  roadLines: '#f4f1de',
  kerbA: '#e63946', kerbB: '#f4f1de',   // striped kerbs on the road edges
  dirt: '#c9a26b',                      // shortcut tracks
  buildingColors: ['#f6a5c0', '#ffd27f', '#9ad1d4', '#c3b1e1', '#f7b267', '#a8e6a1', '#ef8a62', '#e9d8a6'],
  buildingMinHeight: 8, buildingMaxHeight: 30,
  roofShade: 0.72,                      // roofs are this much darker than the walls
  treeTrunk: '#8d5b3e', treeLeaves: '#3f9b4f',
  treeStyle: 'pine',                    // 'pine' or 'round'
  fence: '#e63946',                     // wall around the edge of the map
  ramp: '#ffb703',
  finishPosts: '#f4f1de', finishBanner: '#14163a',
};

// =====================================================================
//  LAYOUT: the circuit
//  Coordinates are in metres. (0,0) is the middle of the map.
// =====================================================================
const MAP_LAYOUT = {
  // Points the circuit passes through, in driving order. The road is smoothed through them
  // and joins back to the first point to make a loop. The first point is the start/finish line.
  track: [
    [0, -220], [140, -230], [230, -170], [250, -60], [190, 10], [120, 30], [100, 100],
    [170, 170], [150, 240], [40, 250], [-60, 200], [-110, 120], [-200, 140], [-260, 60],
    [-240, -60], [-170, -150], [-90, -210],
  ],
  roadWidth: 22,
  // Dirt shortcuts. Each is a list of points from where it leaves the road to where it rejoins.
  // The first and last points snap onto the nearest bit of road automatically.
  shortcuts: [
    [[250, -45], [246, 40], [215, 110], [172, 165]],
    [[-50, 205], [-120, 182], [-195, 148]],
  ],
  shortcutWidth: 10,
  // Jump ramps. 'lap' is how far round the lap (0 = start line, 0.5 = halfway).
  // A ramp with 'shortcut' sits on that shortcut instead, 'at' is how far along it (0 to 1).
  ramps: [{ lap: 0.04 }, { lap: 0.52 }, { lap: 0.86 }, { shortcut: 0, at: 0.35 }],
  rampLength: 10, rampHeight: 2.6,
  grassSpeed: 0.7,   // top speed on grass (0.7 = 70%)
  dirtSpeed: 0.9,    // top speed on the dirt shortcuts
  trees: 260,
  buildings: 90,
  size: 340,         // distance from the middle to the edge wall
  seed: 7,           // change to shuffle where buildings and trees go
};
// =====================================================================

function buildMap(scene){
  const T = MAP_THEME, L = MAP_LAYOUT;
  const rand = (function(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(L.seed);
  const mat = c => new THREE.MeshLambertMaterial({ color: c });

  scene.background = new THREE.Color(T.sky);
  scene.fog = new THREE.Fog(T.sky, T.fogNear, T.fogFar);
  scene.add(new THREE.HemisphereLight(T.skyLight, T.groundLight, T.ambientStrength));
  const sun = new THREE.DirectionalLight(T.sunColor, T.sunStrength); sun.position.set(60, 100, 40); scene.add(sun);

  // ---------- sample a smooth curve every ~2 m ----------
  function sampleCurve(points, closed){
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
    const len = curve.getLength(), n = Math.max(8, Math.round(len / 2));
    const pts = curve.getSpacedPoints(n);
    if (closed) pts.pop();
    const out = pts.map(p => ({ x: p.x, z: p.z, tx: 0, tz: 0 }));
    const m = out.length;
    for (let i = 0; i < m; i++) {
      const a = out[closed ? (i - 1 + m) % m : Math.max(0, i - 1)], b = out[closed ? (i + 1) % m : Math.min(m - 1, i + 1)];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1;
      out[i].tx = dx / d; out[i].tz = dz / d;
    }
    return { samples: out, length: len, ds: len / (closed ? m : m - 1) };
  }
  const main = sampleCurve(L.track, true);
  const S = main.samples, N = S.length, HALF = L.roadWidth / 2;
  function nearestFull(samples, x, z){
    let best = Infinity, bi = 0;
    for (let i = 0; i < samples.length; i++) { const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2; if (d < best) { best = d; bi = i; } }
    return { i: bi, d: Math.sqrt(best) };
  }
  const shortcuts = L.shortcuts.map(pts => {
    const p = pts.map(q => q.slice());
    [0, p.length - 1].forEach(k => { const n = nearestFull(S, p[k][0], p[k][1]); p[k] = [S[n.i].x, S[n.i].z]; });
    const c = sampleCurve(p, false);
    return { samples: c.samples, length: c.length, half: L.shortcutWidth / 2 };
  });

  // ---------- ribbons (road, dirt, kerbs) ----------
  function ribbon(samples, closed, inner, outer, y, colorFn){
    const pos = [], col = [], m = samples.length, segs = closed ? m : m - 1, c = new THREE.Color();
    const edge = (s, off) => [s.x - s.tz * off, s.z + s.tx * off];
    for (let i = 0; i < segs; i++) {
      const a = samples[i], b = samples[(i + 1) % m];
      const a1 = edge(a, inner), a2 = edge(a, outer), b1 = edge(b, inner), b2 = edge(b, outer);
      pos.push(a1[0], y, a1[1], a2[0], y, a2[1], b1[0], y, b1[1], a2[0], y, a2[1], b2[0], y, b2[1], b1[0], y, b1[1]);
      c.set(colorFn(i)); for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    scene.add(mesh); return mesh;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L.size * 4, L.size * 4), mat(T.grass));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  shortcuts.forEach(sc => ribbon(sc.samples, false, -sc.half, sc.half, 0.015, () => T.dirt));
  ribbon(S, true, -HALF, HALF, 0.02, () => T.road);
  ribbon(S, true, HALF, HALF + 1.5, 0.035, i => (Math.floor(i / 2) % 2 ? T.kerbA : T.kerbB));
  ribbon(S, true, -HALF - 1.5, -HALF, 0.035, i => (Math.floor(i / 2) % 2 ? T.kerbA : T.kerbB));
  // centre dashes
  const dashIdx = []; for (let i = 0; i < N; i += 4) dashIdx.push(i);
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.02, 3.2), new THREE.MeshBasicMaterial({ color: T.roadLines }), dashIdx.length);
  const o = new THREE.Object3D();
  dashIdx.forEach((i, k) => { o.position.set(S[i].x, 0.04, S[i].z); o.rotation.set(0, Math.atan2(S[i].tx, S[i].tz), 0); o.updateMatrix(); dashes.setMatrixAt(k, o.matrix); });
  scene.add(dashes);

  // ---------- start / finish ----------
  (function(){
    const s = S[0], g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = Math.atan2(s.tx, s.tz); scene.add(g);
    const sq = L.roadWidth / 11, white = mat('#ffffff'), black = mat('#111111'), geo = new THREE.BoxGeometry(sq, 0.03, sq);
    for (let i = 0; i < 11; i++) for (let j = 0; j < 2; j++) { const b = new THREE.Mesh(geo, (i + j) % 2 ? black : white); b.position.set(-HALF + sq * (i + 0.5), 0.05, (j - 0.5) * sq); g.add(b); }
    [-1, 1].forEach(side => { const p = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 1), mat(T.finishPosts)); p.position.set(side * (HALF + 2.5), 4.5, 0); g.add(p); });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(L.roadWidth + 6, 2, 0.6), mat(T.finishBanner)); banner.position.set(0, 8.5, 0); g.add(banner);
    for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.65), (i % 2 ? white : black)); c.position.set(-HALF - 2 + (i + 0.5) * ((L.roadWidth + 4) / 12), 8.5 + (i % 2 ? 0.5 : -0.5), 0); g.add(c); }
  })();

  // ---------- ramps ----------
  const ramps = L.ramps.map(r => {
    const src = r.shortcut !== undefined ? shortcuts[r.shortcut].samples : S;
    const i = r.shortcut !== undefined ? Math.round(r.at * (src.length - 1)) : Math.round(((r.lap % 1) + 1) % 1 * N) % N;
    const s = src[i], w = r.shortcut !== undefined ? L.shortcutWidth - 1 : L.roadWidth - 2;
    const ramp = { x: s.x, z: s.z, dx: s.tx, dz: s.tz, len: L.rampLength, h: L.rampHeight, w, lapIndex: r.shortcut !== undefined ? -1 : i };
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(ramp.len, 0); shape.lineTo(ramp.len, ramp.h); shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2);
    const m = new THREE.Mesh(geo, mat(T.ramp)); m.position.set(ramp.x, 0.02, ramp.z); m.rotation.y = Math.atan2(-ramp.dz, ramp.dx); scene.add(m);
    return ramp;
  });

  // ---------- scenery ----------
  const distRoad = (x, z) => {
    let d = nearestFull(S, x, z).d - HALF;
    shortcuts.forEach(sc => { d = Math.min(d, nearestFull(sc.samples, x, z).d - sc.half); });
    return d;
  };
  const solids = [], circles = [], lim = L.size - 12;
  const bColors = [], bMats = [], roofMats = [];
  let tries = 0;
  while (solids.length < L.buildings && tries++ < L.buildings * 40) {
    const w = 10 + rand() * 12, d = 10 + rand() * 12, x = (rand() * 2 - 1) * lim, z = (rand() * 2 - 1) * lim;
    if (distRoad(x, z) < Math.hypot(w, d) / 2 + 7) continue;
    if (solids.some(b => x + w / 2 + 3 > b.minX && x - w / 2 - 3 < b.maxX && z + d / 2 + 3 > b.minZ && z - d / 2 - 3 < b.maxZ)) continue;
    const h = T.buildingMinHeight + rand() * (T.buildingMaxHeight - T.buildingMinHeight);
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h, color: T.buildingColors[Math.floor(rand() * T.buildingColors.length)] });
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const walls = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: '#ffffff' }), solids.length);
  const roofs = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: '#ffffff' }), solids.length);
  const col = new THREE.Color();
  solids.forEach((b, k) => {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    o.position.set(cx, b.h / 2, cz); o.rotation.set(0, 0, 0); o.scale.set(w, b.h, d); o.updateMatrix(); walls.setMatrixAt(k, o.matrix);
    o.position.set(cx, b.h + 0.4, cz); o.scale.set(w + 0.6, 0.8, d + 0.6); o.updateMatrix(); roofs.setMatrixAt(k, o.matrix);
    col.set(b.color); walls.setColorAt(k, col); col.multiplyScalar(T.roofShade); roofs.setColorAt(k, col);
  });
  if (solids.length) { scene.add(walls); scene.add(roofs); }

  const trees = [];
  tries = 0;
  while (trees.length < L.trees && tries++ < L.trees * 30) {
    const x = (rand() * 2 - 1) * lim, z = (rand() * 2 - 1) * lim;
    if (distRoad(x, z) < 5) continue;
    if (solids.some(b => x > b.minX - 3 && x < b.maxX + 3 && z > b.minZ - 3 && z < b.maxZ + 3)) continue;
    trees.push({ x, z, s: 0.8 + rand() * 0.7 });
  }
  for (let i = 0; i < 80; i++) { const a = rand() * Math.PI * 2, r = L.size + 15 + rand() * 80; trees.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.9 + rand() * 0.8, outside: true }); }
  const trunks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 3, 0.8), mat(T.treeTrunk), trees.length);
  const crownGeo = T.treeStyle === 'round' ? new THREE.IcosahedronGeometry(2.8, 0) : new THREE.ConeGeometry(2.6, 6, 7);
  const crowns = new THREE.InstancedMesh(crownGeo, mat(T.treeLeaves), trees.length);
  trees.forEach((t, k) => {
    o.rotation.set(0, 0, 0); o.scale.set(t.s, t.s, t.s);
    o.position.set(t.x, 1.5 * t.s, t.z); o.updateMatrix(); trunks.setMatrixAt(k, o.matrix);
    o.position.set(t.x, (T.treeStyle === 'round' ? 5 : 5.5) * t.s, t.z); o.updateMatrix(); crowns.setMatrixAt(k, o.matrix);
    if (!t.outside) circles.push({ x: t.x, z: t.z, r: 0.9 * t.s });
  });
  scene.add(trunks); scene.add(crowns);

  // edge wall
  const E = L.size;
  [[0, -E - 2, E * 2 + 6, 1], [0, E + 2, E * 2 + 6, 1], [-E - 2, 0, 1, E * 2 + 6], [E + 2, 0, 1, E * 2 + 6]].forEach(([x, z, w, d]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), mat(T.fence)); f.position.set(x, 0.7, z); scene.add(f);
  });

  // ---------- helpers for the game ----------
  function nearestIndex(x, z, from, back, fwd){
    let best = Infinity, bi = from;
    for (let k = -back; k <= fwd; k++) { const i = ((from + k) % N + N) % N, d = (S[i].x - x) ** 2 + (S[i].z - z) ** 2; if (d < best) { best = d; bi = i; } }
    return bi;
  }
  function surfaceAt(x, z){
    if (nearestFull(S, x, z).d < HALF + 1.5) return 'road';
    if (shortcuts.some(sc => nearestFull(sc.samples, x, z).d < sc.half + 1)) return 'dirt';
    return 'grass';
  }
  return { samples: S, N, ds: main.ds, total: main.length, half: HALF, shortcuts, ramps, solids, circles, edge: E - 1,
    nearestIndex, nearestFull: (x, z) => nearestFull(S, x, z), surfaceAt };
}
