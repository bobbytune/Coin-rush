// Coin Rush map: change the look (MAP_THEME) and the circuit and world (MAP_LAYOUT) here.

// =====================================================================
//  LOOK: colours and scenery style
// =====================================================================
const MAP_THEME = {
  sky: '#8ccff5',            // sky and distant haze
  fogNear: 170, fogFar: 420, // where the haze starts and ends
  sunColor: '#ffffff', sunStrength: 0.75,
  skyLight: '#e8f6ff', groundLight: '#5d8a4a', ambientStrength: 0.95,
  grass: '#86c45a',
  road: '#3f4257',
  roadLines: '#f4f1de',
  kerbA: '#ffb703', kerbB: '#3f4257',   // striped kerbs on the road edges
  dirt: '#c9a26b',                      // dirt shortcuts
  alley: '#5c5f73',                     // paved back-alley shortcuts
  water: '#2f8fd8',
  bank: '#e3cf9a',                      // sandy edge around water
  bridgeRail: '#e9ecef',
  treeTrunk: '#8d5b3e', treeLeaves: '#3f9b4f',
  treeStyle: 'round',                   // 'pine' or 'round'
  fence: '#e63946',                     // wall around the edge of the map
  ramp: '#ff4f8b',
  finishPosts: '#f4f1de', finishBanner: '#14163a',
  // Building styles for each area of the map (areas are set in MAP_LAYOUT.districts)
  styles: {
    downtown:   { colors: ['#9db4c0', '#5c6b73', '#c2dfe3', '#e0fbfc', '#8d99ae', '#b8c0ff'], minHeight: 24, maxHeight: 55, minSize: 12, maxSize: 20, roof: 'flat', trees: 0.15 },
    industrial: { colors: ['#adb5bd', '#c05746', '#7d8597', '#d4a373', '#6c757d'], minHeight: 6, maxHeight: 12, minSize: 14, maxSize: 26, roof: 'flat', trees: 0.1 },
    houses:     { colors: ['#f6a5c0', '#ffd27f', '#9ad1d4', '#c3b1e1', '#f7b267', '#a8e6a1'], minHeight: 4, maxHeight: 7, minSize: 8, maxSize: 11, roof: 'pointed', roofColor: '#b5523b', trees: 1 },
    park:       { colors: ['#e9d8a6'], minHeight: 3, maxHeight: 4, minSize: 5, maxSize: 7, roof: 'pointed', roofColor: '#6a994e', trees: 1.6 },
    town:       { colors: ['#ef8a62', '#ffd27f', '#9ad1d4', '#f6a5c0', '#e9d8a6', '#c3b1e1'], minHeight: 8, maxHeight: 18, minSize: 10, maxSize: 16, roof: 'flat', trees: 0.6 },
  },
  roofShade: 0.72,                      // flat roofs are this much darker than the walls
};

// =====================================================================
//  LAYOUT: the circuit and the world around it
//  Coordinates are in metres. (0,0) is the middle of the map.
// =====================================================================
const MAP_LAYOUT = {
  size: 220,         // distance from the middle to the edge wall
  // Points the circuit passes through, in driving order. The road is smoothed through them
  // and joins back to the first point to make a loop. The first point is the start/finish line.
  track: [
    [0, -182], [100, -184], [160, -180], [186, -150], [190, -60], [188, 40], [186, 130], [174, 172], [150, 186],
    [80, 190], [0, 188], [-80, 186], [-150, 175], [-182, 130], [-170, 82], [-120, 72], [-75, 100], [-38, 92],
    [-14, 50], [6, 18], [28, 48], [50, 92], [82, 84], [96, 30], [88, -30], [62, -80], [10, -78], [-30, -36], [-80, -14], [-140, -30],
    [-180, -78], [-172, -140], [-110, -176],
  ],
  roadWidth: 22,
  // Shortcuts. Each one is a list of points from where it leaves the road to where it rejoins
  // (the first and last points snap onto the road). 'surface' is 'dirt' or 'alley'.
  shortcuts: [
    { points: [[188, 30], [168, 72], [140, 100], [112, 124], [96, 156], [84, 190]], surface: 'dirt', width: 10 },   // river jump
    { points: [[-180, -84], [-150, -128], [-112, -174]], surface: 'alley', width: 9 },                           // downtown back alley
    { points: [[-40, 92], [5, 84], [48, 92]], surface: 'dirt', width: 9 },                             // park path
  ],
  // Jump ramps, placed on the road nearest to 'near'. Add 'shortcut' to put one on a shortcut instead.
  ramps: [
    { near: [55, -183] },
    { near: [189, -95] },
    { near: [-20, 188] },
    { near: [150, 92], shortcut: 0 },   // launch over the river
  ],
  rampLength: 10, rampHeight: 2.6,
  // Water. Falling in puts you back on the road. Roads crossing water become bridges.
  water: [
    { minX: 120, maxX: 144, minZ: -230, maxZ: 230 },   // river
    { minX: -150, maxX: -95, minZ: 10, maxZ: 40 },      // park pond
  ],
  // Areas of the map and which building style they use (styles are in MAP_THEME.styles).
  // The first matching area wins; anywhere else uses 'town'.
  districts: [
    { style: 'industrial', area: [144, 230, -230, 230] },
    { style: 'downtown',   area: [-230, 120, -230, -110] },
    { style: 'houses',     area: [-230, 120, 140, 230] },
    { style: 'park',       area: [-160, 60, -20, 120] },
  ],
  grassSpeed: 0.7,   // top speed on grass (0.7 = 70%)
  dirtSpeed: 0.9,    // top speed on dirt shortcuts
  alleySpeed: 1,     // top speed in back alleys
  buildings: 190,
  trees: 220,
  seed: 11,          // change to shuffle where buildings and trees go
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
  const shortcuts = L.shortcuts.map(sc => {
    const p = sc.points.map(q => q.slice());
    [0, p.length - 1].forEach(k => { const n = nearestFull(S, p[k][0], p[k][1]); p[k] = [S[n.i].x, S[n.i].z]; });
    const c = sampleCurve(p, false);
    return { samples: c.samples, length: c.length, half: sc.width / 2, surface: sc.surface };
  });
  const inWater = (x, z, pad = 0) => L.water.some(w => x > w.minX - pad && x < w.maxX + pad && z > w.minZ - pad && z < w.maxZ + pad);

  // ---------- ground and water ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L.size * 5, L.size * 5), mat(T.grass));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  L.water.forEach(w => {
    const minX = Math.max(w.minX, -L.size - 3), maxX = Math.min(w.maxX, L.size + 3), minZ = Math.max(w.minZ, -L.size - 3), maxZ = Math.min(w.maxZ, L.size + 3);
    const bank = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 6, maxZ - minZ + 6), mat(T.bank));
    bank.rotation.x = -Math.PI / 2; bank.position.set((minX + maxX) / 2, 0.01, (minZ + maxZ) / 2); scene.add(bank);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), new THREE.MeshLambertMaterial({ color: T.water, emissive: T.water, emissiveIntensity: 0.15 }));
    water.rotation.x = -Math.PI / 2; water.position.set((minX + maxX) / 2, 0.03, (minZ + maxZ) / 2); scene.add(water);
  });

  // ---------- ribbons (road, shortcuts, kerbs) ----------
  function ribbon(samples, closed, inner, outer, y, colorFn, skip){
    const pos = [], col = [], m = samples.length, segs = closed ? m : m - 1, c = new THREE.Color();
    const edge = (s, off) => [s.x - s.tz * off, s.z + s.tx * off];
    for (let i = 0; i < segs; i++) {
      const a = samples[i], b = samples[(i + 1) % m];
      if (skip && skip(a, b)) continue;
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
  shortcuts.forEach(sc => ribbon(sc.samples, false, -sc.half, sc.half, 0.02, () => (sc.surface === 'alley' ? T.alley : T.dirt), (a, b) => inWater(a.x, a.z) || inWater(b.x, b.z)));
  ribbon(S, true, -HALF, HALF, 0.05, () => T.road);
  const kerb = i => (Math.floor(i / 2) % 2 ? T.kerbA : T.kerbB);
  ribbon(S, true, HALF, HALF + 1.5, 0.06, kerb);
  ribbon(S, true, -HALF - 1.5, -HALF, 0.06, kerb);
  const o = new THREE.Object3D();
  // centre dashes
  const dashIdx = []; for (let i = 0; i < N; i += 4) dashIdx.push(i);
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.02, 3.2), new THREE.MeshBasicMaterial({ color: T.roadLines }), dashIdx.length);
  dashIdx.forEach((i, k) => { o.position.set(S[i].x, 0.07, S[i].z); o.rotation.set(0, Math.atan2(S[i].tx, S[i].tz), 0); o.updateMatrix(); dashes.setMatrixAt(k, o.matrix); });
  scene.add(dashes);
  // bridge rails wherever the road crosses water
  const railIdx = []; for (let i = 0; i < N; i++) if (inWater(S[i].x, S[i].z, 4)) railIdx.push(i);
  if (railIdx.length) {
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 1.1, 2.2), mat(T.bridgeRail), railIdx.length * 2);
    railIdx.forEach((i, k) => [-1, 1].forEach((side, j) => {
      const s = S[i], off = side * (HALF + 2);
      o.position.set(s.x - s.tz * off, 0.6, s.z + s.tx * off); o.rotation.set(0, Math.atan2(s.tx, s.tz), 0); o.updateMatrix(); rails.setMatrixAt(k * 2 + j, o.matrix);
    }));
    scene.add(rails);
  }

  // ---------- start / finish ----------
  (function(){
    const s = S[0], g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = Math.atan2(s.tx, s.tz); scene.add(g);
    const sq = L.roadWidth / 11, white = mat('#ffffff'), black = mat('#111111'), geo = new THREE.BoxGeometry(sq, 0.03, sq);
    for (let i = 0; i < 11; i++) for (let j = 0; j < 2; j++) { const b = new THREE.Mesh(geo, (i + j) % 2 ? black : white); b.position.set(-HALF + sq * (i + 0.5), 0.08, (j - 0.5) * sq); g.add(b); }
    [-1, 1].forEach(side => { const p = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 1), mat(T.finishPosts)); p.position.set(side * (HALF + 2.5), 4.5, 0); g.add(p); });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(L.roadWidth + 6, 2, 0.6), mat(T.finishBanner)); banner.position.set(0, 8.5, 0); g.add(banner);
    for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.65), (i % 2 ? white : black)); c.position.set(-HALF - 2 + (i + 0.5) * ((L.roadWidth + 4) / 12), 8.5 + (i % 2 ? 0.5 : -0.5), 0); g.add(c); }
  })();

  // ---------- ramps ----------
  const ramps = L.ramps.map(r => {
    const onShort = r.shortcut !== undefined, src = onShort ? shortcuts[r.shortcut].samples : S;
    const s = src[nearestFull(src, r.near[0], r.near[1]).i], w = onShort ? L.shortcuts[r.shortcut].width - 1 : L.roadWidth - 2;
    const ramp = { x: s.x - s.tx * L.rampLength, z: s.z - s.tz * L.rampLength, dx: s.tx, dz: s.tz, len: L.rampLength, h: L.rampHeight, w, track: !onShort };
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(ramp.len, 0); shape.lineTo(ramp.len, ramp.h); shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2);
    const m = new THREE.Mesh(geo, mat(T.ramp)); m.position.set(ramp.x, 0.05, ramp.z); m.rotation.y = Math.atan2(-ramp.dz, ramp.dx); scene.add(m);
    return ramp;
  });

  // ---------- scenery ----------
  const distRoad = (x, z) => {
    let d = nearestFull(S, x, z).d - HALF - 1.5;
    shortcuts.forEach(sc => { d = Math.min(d, nearestFull(sc.samples, x, z).d - sc.half); });
    return d;
  };
  const styleAt = (x, z) => { const d = L.districts.find(d => x >= d.area[0] && x <= d.area[1] && z >= d.area[2] && z <= d.area[3]); return T.styles[d ? d.style : 'town']; };
  const solids = [], circles = [], lim = L.size - 8;
  let tries = 0;
  while (solids.length < L.buildings && tries++ < L.buildings * 60) {
    const x = (rand() * 2 - 1) * lim, z = (rand() * 2 - 1) * lim, st = styleAt(x, z);
    const w = st.minSize + rand() * (st.maxSize - st.minSize), d = st.minSize + rand() * (st.maxSize - st.minSize);
    if (Math.abs(x) + w / 2 > lim || Math.abs(z) + d / 2 > lim) continue;
    if (distRoad(x, z) < Math.hypot(w, d) / 2 + 4) continue;
    if (L.water.some(wt => x + w / 2 + 4 > wt.minX && x - w / 2 - 4 < wt.maxX && z + d / 2 + 4 > wt.minZ && z - d / 2 - 4 < wt.maxZ)) continue;
    if (solids.some(b => x + w / 2 + 3 > b.minX && x - w / 2 - 3 < b.maxX && z + d / 2 + 3 > b.minZ && z - d / 2 - 3 < b.maxZ)) continue;
    const h = st.minHeight + rand() * (st.maxHeight - st.minHeight);
    solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h, color: st.colors[Math.floor(rand() * st.colors.length)], roof: st.roof, roofColor: st.roofColor });
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const pyramid = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); pyramid.rotateY(Math.PI / 4);
  const flats = solids.filter(b => b.roof !== 'pointed'), points = solids.filter(b => b.roof === 'pointed');
  const walls = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: '#ffffff' }), Math.max(1, solids.length));
  const flatRoofs = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: '#ffffff' }), Math.max(1, flats.length));
  const peakRoofs = new THREE.InstancedMesh(pyramid, new THREE.MeshLambertMaterial({ color: '#ffffff' }), Math.max(1, points.length));
  const col = new THREE.Color();
  let fi = 0, pi = 0;
  solids.forEach((b, k) => {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    o.rotation.set(0, 0, 0);
    o.position.set(cx, b.h / 2, cz); o.scale.set(w, b.h, d); o.updateMatrix(); walls.setMatrixAt(k, o.matrix);
    col.set(b.color); walls.setColorAt(k, col);
    if (b.roof === 'pointed') {
      const rh = Math.min(w, d) * 0.45;
      o.position.set(cx, b.h + rh / 2, cz); o.scale.set(w + 1, rh, d + 1); o.updateMatrix(); peakRoofs.setMatrixAt(pi, o.matrix);
      col.set(b.roofColor || b.color); peakRoofs.setColorAt(pi++, col);
    } else {
      o.position.set(cx, b.h + 0.4, cz); o.scale.set(w + 0.6, 0.8, d + 0.6); o.updateMatrix(); flatRoofs.setMatrixAt(fi, o.matrix);
      col.set(b.color).multiplyScalar(T.roofShade); flatRoofs.setColorAt(fi++, col);
    }
  });
  walls.count = solids.length; flatRoofs.count = fi; peakRoofs.count = pi;
  scene.add(walls); scene.add(flatRoofs); scene.add(peakRoofs);

  const trees = [];
  tries = 0;
  while (trees.length < L.trees && tries++ < L.trees * 40) {
    const x = (rand() * 2 - 1) * lim, z = (rand() * 2 - 1) * lim;
    if (rand() > styleAt(x, z).trees * 0.6) continue;
    if (distRoad(x, z) < 4 || inWater(x, z, 4)) continue;
    if (solids.some(b => x > b.minX - 3 && x < b.maxX + 3 && z > b.minZ - 3 && z < b.maxZ + 3)) continue;
    trees.push({ x, z, s: 0.8 + rand() * 0.6 });
  }
  for (let i = 0; i < 90; i++) { const a = rand() * Math.PI * 2, r = L.size + 15 + rand() * 90, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!inWater(x, z, 3)) trees.push({ x, z, s: 0.9 + rand() * 0.8, outside: true }); }
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

  // edge wall (gaps where water flows out)
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
    const sc = shortcuts.find(sc => nearestFull(sc.samples, x, z).d < sc.half + 1);
    if (sc && !inWater(x, z)) return sc.surface;
    if (inWater(x, z)) return 'water';
    return 'grass';
  }
  return { samples: S, N, ds: main.ds, total: main.length, half: HALF, shortcuts, ramps, solids, circles, water: L.water, edge: E - 1,
    nearestIndex, nearestFull: (x, z) => nearestFull(S, x, z), surfaceAt };
}
