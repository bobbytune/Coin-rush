// Coin Rush map: change the look (MAP_THEME) and the circuit and world (MAP_LAYOUT) here.

// =====================================================================
//  LOOK: colours and scenery style
// =====================================================================
const MAP_THEME = {
  sky: '#bfe3f7',            // sky colour at the horizon (and the distant haze)
  skyTop: '#3d8fdc',         // sky colour straight up
  clouds: '#ffffff',
  fogNear: 170, fogFar: 420, // where the haze starts and ends
  sunColor: '#fff4e0', sunStrength: 1.0,
  skyLight: '#e8f6ff', groundLight: '#5d8a4a', ambientStrength: 0.72,
  grass: '#6aa84f',
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

function buildMap(scene, renderer){
  const T = MAP_THEME, L = MAP_LAYOUT;
  const rand = (function(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(L.seed);
  const mat = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {}));
  const o = new THREE.Object3D();
  const maxAniso = renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  function makeTex(size, draw, rx = 1, ry = 1){
    const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = maxAniso;
    return t;
  }
  const trand = (function(seed){ return function(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; })(12345);   // separate dice for textures and sky
  function speckle(g, size, lo, hi, count, r){
    for (let i = 0; i < count; i++) { const v = Math.floor(lo + trand() * (hi - lo)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(trand() * size, trand() * size, r, r); }
  }

  // ---------- sky, sun and clouds (they travel with the camera) ----------
  const horizon = new THREE.Color(T.sky), zenith = new THREE.Color(T.skyTop || T.sky);
  scene.background = horizon.clone();
  scene.fog = new THREE.Fog(T.sky, T.fogNear, T.fogFar);
  const sky = new THREE.Group(); scene.add(sky);
  (function(){
    const g = new THREE.SphereGeometry(700, 32, 16), p = g.attributes.position, cols = [], c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const h = Math.max(0, p.getY(i) / 700); c.copy(horizon).lerp(zenith, Math.pow(h, 0.55)); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const dome = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.renderOrder = -2; sky.add(dome);
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 12), new THREE.MeshBasicMaterial({ color: '#fffbe8', fog: false }));
    sunDisc.position.set(70, 130, 45).normalize().multiplyScalar(620); sky.add(sunDisc);
    const puff = new THREE.SphereGeometry(1, 12, 8), cloudMat = mat(T.clouds || '#ffffff', { fog: false, emissive: '#b8c6d6', emissiveIntensity: 0.45 });
    const clouds = new THREE.InstancedMesh(puff, cloudMat, 16 * 6);
    let k = 0;
    for (let i = 0; i < 16; i++) {
      const a = trand() * Math.PI * 2, el = 0.12 + trand() * 0.28, r = 560;
      const cx = Math.cos(a) * Math.cos(el) * r, cy = Math.sin(el) * r, cz = Math.sin(a) * Math.cos(el) * r, size = 18 + trand() * 22;
      for (let j = 0; j < 6; j++) {
        o.position.set(cx + (trand() - 0.5) * size * 2.4, cy + (trand() - 0.3) * size * 0.4, cz + (trand() - 0.5) * size * 2.4);
        const s = size * (0.55 + trand() * 0.5); o.scale.set(s, s * 0.55, s); o.rotation.set(0, 0, 0); o.updateMatrix(); clouds.setMatrixAt(k++, o.matrix);
      }
    }
    clouds.renderOrder = -1; sky.add(clouds);
  })();

  // ---------- lights (the sun casts shadows around the player) ----------
  scene.add(new THREE.HemisphereLight(T.skyLight, T.groundLight, T.ambientStrength));
  const sun = new THREE.DirectionalLight(T.sunColor, T.sunStrength);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const scam = sun.shadow.camera; scam.left = -85; scam.right = 85; scam.top = 85; scam.bottom = -85; scam.near = 20; scam.far = 420;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  sun.position.set(70, 130, 45); scene.add(sun); scene.add(sun.target);
  function followSun(x, z){ sun.position.set(x + 70, 130, z + 45); sun.target.position.set(x, 0, z); }

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

  // ---------- textures (drawn in code, tinted by each surface's colour) ----------
  const asphalt = makeTex(256, (g, s) => { g.fillStyle = 'rgb(236,236,236)'; g.fillRect(0, 0, s, s); speckle(g, s, 175, 230, 5000, 2); speckle(g, s, 240, 255, 900, 1.5);
    g.strokeStyle = 'rgba(120,120,120,.35)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); let x = trand() * s, y = trand() * s; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (trand() - 0.5) * 30; y += trand() * 20; g.lineTo(x, y); } g.stroke(); } });
  const grassTex = makeTex(256, (g, s) => { g.fillStyle = 'rgb(232,232,232)'; g.fillRect(0, 0, s, s); speckle(g, s, 170, 255, 9000, 2);
    for (let i = 0; i < 2500; i++) { const v = Math.floor(185 + trand() * 70); g.strokeStyle = `rgb(${v},${v},${v})`; g.beginPath(); const x = trand() * s, y = trand() * s; g.moveTo(x, y); g.lineTo(x + (trand() - 0.5) * 3, y - 3 - trand() * 4); g.stroke(); } }, L.size * 5 / 10, L.size * 5 / 10);
  const dirtTex = makeTex(256, (g, s) => { g.fillStyle = 'rgb(230,230,230)'; g.fillRect(0, 0, s, s); speckle(g, s, 150, 255, 6000, 3); });
  const facade = makeTex(64, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, 3);
    g.fillStyle = '#4f5d75'; g.fillRect(12, 12, 40, 36);
    g.fillStyle = '#8399b5'; g.fillRect(12, 12, 40, 12);
    g.fillStyle = '#c8d4e2'; g.fillRect(14, 14, 10, 6);
    g.fillStyle = '#ffffff'; g.fillRect(31, 12, 2, 36);
    g.fillStyle = '#cfcfcf'; g.fillRect(9, 48, 46, 4);
  });

  // ---------- ground and water ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L.size * 5, L.size * 5), mat(T.grass, { map: grassTex }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  L.water.forEach(w => {
    const minX = Math.max(w.minX, -L.size - 3), maxX = Math.min(w.maxX, L.size + 3), minZ = Math.max(w.minZ, -L.size - 3), maxZ = Math.min(w.maxZ, L.size + 3);
    const bank = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 6, maxZ - minZ + 6), mat(T.bank, { map: dirtTex }));
    bank.rotation.x = -Math.PI / 2; bank.position.set((minX + maxX) / 2, 0.01, (minZ + maxZ) / 2); bank.receiveShadow = true; scene.add(bank);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), new THREE.MeshPhongMaterial({ color: T.water, emissive: T.water, emissiveIntensity: 0.12, shininess: 90, specular: '#ffffff' }));
    water.rotation.x = -Math.PI / 2; water.position.set((minX + maxX) / 2, 0.03, (minZ + maxZ) / 2); water.receiveShadow = true; scene.add(water);
  });

  // ---------- ribbons (road, shortcuts, kerbs, edge lines) ----------
  function ribbon(samples, closed, inner, outer, y, colorFn, opts = {}){
    const pos = [], col = [], uv = [], m = samples.length, segs = closed ? m : m - 1, c = new THREE.Color();
    const edge = (s, off) => [s.x - s.tz * off, s.z + s.tx * off];
    let dist = 0; const uw = (outer - inner) / 8;
    for (let i = 0; i < segs; i++) {
      const a = samples[i], b = samples[(i + 1) % m], seg = Math.hypot(b.x - a.x, b.z - a.z);
      const v1 = dist / 8, v2 = (dist + seg) / 8; dist += seg;
      if (opts.skip && opts.skip(a, b)) continue;
      const a1 = edge(a, inner), a2 = edge(a, outer), b1 = edge(b, inner), b2 = edge(b, outer);
      pos.push(a1[0], y, a1[1], a2[0], y, a2[1], b1[0], y, b1[1], a2[0], y, a2[1], b2[0], y, b2[1], b1[0], y, b1[1]);
      uv.push(0, v1, uw, v1, 0, v2, uw, v1, uw, v2, 0, v2);
      c.set(colorFn(i)); for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: opts.map || null }));
    mesh.receiveShadow = true; scene.add(mesh); return mesh;
  }
  const notWater = { skip: (a, b) => inWater(a.x, a.z) || inWater(b.x, b.z) };
  shortcuts.forEach(sc => ribbon(sc.samples, false, -sc.half, sc.half, 0.02, () => (sc.surface === 'alley' ? T.alley : T.dirt), { skip: notWater.skip, map: sc.surface === 'alley' ? asphalt : dirtTex }));
  ribbon(S, true, -HALF, HALF, 0.05, () => T.road, { map: asphalt });
  const kerb = i => (Math.floor(i / 2) % 2 ? T.kerbA : T.kerbB);
  ribbon(S, true, HALF, HALF + 1.5, 0.06, kerb);
  ribbon(S, true, -HALF - 1.5, -HALF, 0.06, kerb);
  ribbon(S, true, HALF - 1.1, HALF - 0.75, 0.062, () => T.roadLines);
  ribbon(S, true, -HALF + 0.75, -HALF + 1.1, 0.062, () => T.roadLines);
  const dashIdx = []; for (let i = 0; i < N; i += 4) dashIdx.push(i);
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.02, 3.2), new THREE.MeshBasicMaterial({ color: T.roadLines }), dashIdx.length);
  dashIdx.forEach((i, k) => { o.position.set(S[i].x, 0.07, S[i].z); o.rotation.set(0, Math.atan2(S[i].tx, S[i].tz), 0); o.scale.set(1, 1, 1); o.updateMatrix(); dashes.setMatrixAt(k, o.matrix); });
  scene.add(dashes);
  const railIdx = []; for (let i = 0; i < N; i++) if (inWater(S[i].x, S[i].z, 4)) railIdx.push(i);
  if (railIdx.length) {
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.1, 2.2), mat(T.bridgeRail), railIdx.length * 2);
    railIdx.forEach((i, k) => [-1, 1].forEach((side, j) => {
      const s = S[i], off = side * (HALF + 2);
      o.position.set(s.x - s.tz * off, 0.6, s.z + s.tx * off); o.rotation.set(0, Math.atan2(s.tx, s.tz), 0); o.scale.set(1, 1, 1); o.updateMatrix(); rails.setMatrixAt(k * 2 + j, o.matrix);
    }));
    rails.castShadow = true; scene.add(rails);
  }

  // ---------- start / finish ----------
  (function(){
    const s = S[0], g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = Math.atan2(s.tx, s.tz); scene.add(g);
    const sq = L.roadWidth / 11, white = mat('#ffffff'), black = mat('#111111'), geo = new THREE.BoxGeometry(sq, 0.03, sq);
    for (let i = 0; i < 11; i++) for (let j = 0; j < 2; j++) { const b = new THREE.Mesh(geo, (i + j) % 2 ? black : white); b.position.set(-HALF + sq * (i + 0.5), 0.08, (j - 0.5) * sq); b.receiveShadow = true; g.add(b); }
    [-1, 1].forEach(side => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 9, 12), mat(T.finishPosts)); p.position.set(side * (HALF + 2.5), 4.5, 0); p.castShadow = true; g.add(p); });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(L.roadWidth + 6, 2, 0.6), mat(T.finishBanner)); banner.position.set(0, 8.5, 0); banner.castShadow = true; g.add(banner);
    for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.65), (i % 2 ? white : black)); c.position.set(-HALF - 2 + (i + 0.5) * ((L.roadWidth + 4) / 12), 8.5 + (i % 2 ? 0.5 : -0.5), 0); g.add(c); }
  })();

  // ---------- ramps ----------
  const ramps = L.ramps.map(r => {
    const onShort = r.shortcut !== undefined, src = onShort ? shortcuts[r.shortcut].samples : S;
    const s = src[nearestFull(src, r.near[0], r.near[1]).i], w = onShort ? L.shortcuts[r.shortcut].width - 1 : L.roadWidth - 2;
    const ramp = { x: s.x - s.tx * L.rampLength, z: s.z - s.tz * L.rampLength, dx: s.tx, dz: s.tz, len: L.rampLength, h: L.rampHeight, w, track: !onShort };
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(ramp.len, 0); shape.lineTo(ramp.len, ramp.h); shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2);
    const m = new THREE.Mesh(geo, mat(T.ramp)); m.position.set(ramp.x, 0.05, ramp.z); m.rotation.y = Math.atan2(-ramp.dz, ramp.dx);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    // chevrons on the ramp surface
    const chev = mat('#ffffff');
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, w * 0.7), chev); const u = 2 + k * 3; c.position.set(u, ramp.h * u / ramp.len + 0.04, 0); c.rotation.z = Math.atan2(ramp.h, ramp.len); m.add(c); }
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
  // all building walls in one textured mesh, windows repeating per floor
  (function(){
    const P = [], Nn = [], U = [], C = [], col = new THREE.Color();
    solids.forEach(b => {
      const w = b.maxX - b.minX, d = b.maxZ - b.minZ, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      const g = new THREE.BoxGeometry(w, b.h, d).toNonIndexed(); g.translate(cx, b.h / 2, cz);
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
      const floors = Math.max(1, Math.round(b.h / 3.6)), colsX = Math.max(1, Math.round(w / 4)), colsZ = Math.max(1, Math.round(d / 4));
      col.set(b.color);
      for (let i = 0; i < p.count; i++) {
        const face = Math.floor(i / 6);
        let u = uv.getX(i), v = uv.getY(i);
        if (face === 2 || face === 3) { u = 0.02; v = 0.02; } else { u *= face < 2 ? colsZ : colsX; v *= floors; }
        P.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(n.getX(i), n.getY(i), n.getZ(i)); U.push(u, v); C.push(col.r, col.g, col.b);
      }
    });
    if (!P.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    const walls = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: facade, vertexColors: true }));
    walls.castShadow = true; walls.receiveShadow = true; scene.add(walls);
  })();
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const pyramid = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); pyramid.rotateY(Math.PI / 4);
  const flats = solids.filter(b => b.roof !== 'pointed'), points = solids.filter(b => b.roof === 'pointed');
  const flatRoofs = new THREE.InstancedMesh(unit, mat('#ffffff'), Math.max(1, flats.length));
  const peakRoofs = new THREE.InstancedMesh(pyramid, mat('#ffffff'), Math.max(1, points.length));
  const chimneys = new THREE.InstancedMesh(unit, mat('#9c6b53'), Math.max(1, points.length));
  const units = new THREE.InstancedMesh(unit, mat('#aab2bd'), Math.max(1, flats.length * 2));
  const col = new THREE.Color();
  let fi = 0, pi = 0, ui = 0;
  solids.forEach(b => {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    o.rotation.set(0, 0, 0);
    if (b.roof === 'pointed') {
      const rh = Math.min(w, d) * 0.45;
      o.position.set(cx, b.h + rh / 2, cz); o.scale.set(w + 1, rh, d + 1); o.updateMatrix(); peakRoofs.setMatrixAt(pi, o.matrix);
      col.set(b.roofColor || b.color); peakRoofs.setColorAt(pi, col);
      o.position.set(cx + w * 0.25, b.h + rh * 0.6, cz - d * 0.2); o.scale.set(0.9, rh * 0.9, 0.9); o.updateMatrix(); chimneys.setMatrixAt(pi++, o.matrix);
    } else {
      o.position.set(cx, b.h + 0.4, cz); o.scale.set(w + 0.6, 0.8, d + 0.6); o.updateMatrix(); flatRoofs.setMatrixAt(fi, o.matrix);
      col.set(b.color).multiplyScalar(T.roofShade); flatRoofs.setColorAt(fi++, col);
      const n = b.h > 10 ? 1 + Math.floor(rand() * 2) : 0;
      for (let k = 0; k < n; k++) {
        const s = 1.5 + rand() * 2;
        o.position.set(cx + (rand() - 0.5) * (w - s - 1), b.h + 0.8 + s * 0.35, cz + (rand() - 0.5) * (d - s - 1)); o.scale.set(s, s * 0.7, s * 1.2); o.updateMatrix(); units.setMatrixAt(ui++, o.matrix);
      }
    }
  });
  flatRoofs.count = fi; peakRoofs.count = pi; chimneys.count = pi; units.count = ui;
  [flatRoofs, peakRoofs, chimneys, units].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });

  // trees: fluffy clusters of spheres (or stacked cones for pines)
  const trees = [];
  tries = 0;
  while (trees.length < L.trees && tries++ < L.trees * 40) {
    const x = (rand() * 2 - 1) * lim, z = (rand() * 2 - 1) * lim;
    if (rand() > styleAt(x, z).trees * 0.6) continue;
    if (distRoad(x, z) < 7 || inWater(x, z, 4)) continue;
    if (solids.some(b => x > b.minX - 3 && x < b.maxX + 3 && z > b.minZ - 3 && z < b.maxZ + 3)) continue;
    trees.push({ x, z, s: 0.8 + rand() * 0.6 });
  }
  for (let i = 0; i < 90; i++) { const a = rand() * Math.PI * 2, r = L.size + 15 + rand() * 90, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!inWater(x, z, 3)) trees.push({ x, z, s: 0.9 + rand() * 0.8, outside: true }); }
  const round = T.treeStyle === 'round', perTree = round ? 4 : 3;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.34, 3.2, 7), mat(T.treeTrunk), trees.length);
  const crownGeo = round ? new THREE.SphereGeometry(1, 12, 9) : new THREE.ConeGeometry(1, 1, 9);
  const crowns = new THREE.InstancedMesh(crownGeo, mat('#ffffff'), trees.length * perTree);
  const leaf = new THREE.Color(T.treeLeaves);
  let ci = 0;
  trees.forEach((t, k) => {
    o.rotation.set(0, rand() * 6, 0); o.scale.set(t.s, t.s, t.s);
    o.position.set(t.x, 1.6 * t.s, t.z); o.updateMatrix(); trunks.setMatrixAt(k, o.matrix);
    for (let j = 0; j < perTree; j++) {
      if (round) {
        const big = j === 0, r = (big ? 2.4 : 1.5 + rand() * 0.6) * t.s;
        o.position.set(t.x + (big ? 0 : (rand() - 0.5) * 2.6 * t.s), (big ? 4.6 : 3.8 + rand() * 2) * t.s, t.z + (big ? 0 : (rand() - 0.5) * 2.6 * t.s)); o.scale.set(r, r * 0.9, r);
      } else {
        const r = (2.6 - j * 0.7) * t.s; o.position.set(t.x, (3.4 + j * 1.7) * t.s, t.z); o.scale.set(r, 3.2 * t.s, r);
      }
      o.updateMatrix(); crowns.setMatrixAt(ci, o.matrix); col.copy(leaf).multiplyScalar(0.82 + rand() * 0.3); crowns.setColorAt(ci++, col);
    }
    if (!t.outside) circles.push({ x: t.x, z: t.z, r: 0.9 * t.s });
  });
  trunks.castShadow = true; crowns.castShadow = true; crowns.receiveShadow = true;
  scene.add(trunks); scene.add(crowns);

  // bushes dotted about the grass
  const bushes = [];
  tries = 0;
  while (bushes.length < 260 && tries++ < 4000) {
    const x = (rand() * 2 - 1) * lim, z = (rand() * 2 - 1) * lim;
    if (distRoad(x, z) < 3 || inWater(x, z, 3)) continue;
    if (solids.some(b => x > b.minX - 1.5 && x < b.maxX + 1.5 && z > b.minZ - 1.5 && z < b.maxZ + 1.5)) continue;
    bushes.push([x, z, 0.6 + rand() * 0.8]);
  }
  const bushMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 6), mat('#ffffff'), bushes.length);
  bushes.forEach(([x, z, s], k) => { o.position.set(x, s * 0.45, z); o.scale.set(s * 1.3, s * 0.8, s * 1.1); o.rotation.set(0, rand() * 6, 0); o.updateMatrix(); bushMesh.setMatrixAt(k, o.matrix); col.copy(leaf).multiplyScalar(0.7 + rand() * 0.35); bushMesh.setColorAt(k, col); });
  bushMesh.receiveShadow = true; scene.add(bushMesh);

  // street lamps along the circuit
  const lamps = [];
  for (let i = 10, side = 1; i < N; i += Math.round(40 / main.ds), side = -side) {
    const s = S[i], off = side * (HALF + 3.5), x = s.x - s.tz * off, z = s.z + s.tx * off;
    if (inWater(x, z, 6) || i < 15 || i > N - 15) continue;
    if (ramps.some(r => Math.hypot(r.x - x, r.z - z) < 30)) continue;
    if (shortcuts.some(sc => nearestFull(sc.samples, x, z).d < sc.half + 4)) continue;
    if (solids.some(b => x > b.minX - 1 && x < b.maxX + 1 && z > b.minZ - 1 && z < b.maxZ + 1)) continue;
    lamps.push({ x, z, ang: Math.atan2(-s.tz * -side, s.tx * -side) });
    circles.push({ x, z, r: 0.25 });
  }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 8), mat('#3b3f4f'), lamps.length);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 2.4), mat('#3b3f4f'), lamps.length);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.22, 1.1), mat('#fff3c4', { emissive: '#ffe9a8', emissiveIntensity: 0.6 }), lamps.length);
  lamps.forEach((l, k) => {
    o.scale.set(1, 1, 1); o.rotation.set(0, l.ang, 0);
    o.position.set(l.x, 3.75, l.z); o.updateMatrix(); poles.setMatrixAt(k, o.matrix);
    const fx = Math.sin(l.ang), fz = Math.cos(l.ang);
    o.position.set(l.x + fx * 1.1, 7.4, l.z + fz * 1.1); o.updateMatrix(); arms.setMatrixAt(k, o.matrix);
    o.position.set(l.x + fx * 2.2, 7.3, l.z + fz * 2.2); o.updateMatrix(); heads.setMatrixAt(k, o.matrix);
  });
  [poles, arms, heads].forEach(m => { m.castShadow = true; scene.add(m); });

  // edge wall
  const E = L.size;
  [[0, -E - 2, E * 2 + 6, 1], [0, E + 2, E * 2 + 6, 1], [-E - 2, 0, 1, E * 2 + 6], [E + 2, 0, 1, E * 2 + 6]].forEach(([x, z, w, d]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), mat(T.fence)); f.position.set(x, 0.7, z); f.castShadow = true; scene.add(f);
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
    nearestIndex, nearestFull: (x, z) => nearestFull(S, x, z), surfaceAt, sky, followSun };
}
