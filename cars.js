// Coin Rush car models: the 3D shape of each car. Stats and names live in settings.js (CARS).
// Each body is a side profile (forward, height) pushed out to the car's width, so the
// silhouette is easy to tweak: change the numbers in 'body' and 'cabin'.

const CAR_MODELS = {
  furia: {   // low wedge supercar
    length: 4.7, width: 2.3,
    body:  [[-2.3, 0.32], [2.2, 0.32], [2.42, 0.46], [2.32, 0.66], [0.75, 0.98], [-1.0, 1.06], [-2.3, 0.98], [-2.38, 0.5]],
    cabin: [[0.85, 0.96], [-0.15, 1.42], [-0.95, 1.4], [-1.65, 1.05]], cabinWidth: 1.65,
    wheels: { front: 1.45, rear: -1.45, x: 1.08, rFront: 0.46, rRear: 0.5, width: 0.42 },
    extras: ['intakes', 'lightbar', 'lowWing', 'splitter'],
  },
  raijin: {  // Japanese GT coupe
    length: 4.6, width: 2.3,
    body:  [[-2.3, 0.32], [2.25, 0.32], [2.36, 0.52], [2.3, 0.84], [0.9, 0.98], [-1.4, 1.02], [-2.25, 1.02], [-2.36, 0.55]],
    cabin: [[0.95, 0.96], [0.0, 1.56], [-1.2, 1.56], [-1.85, 1.0]], cabinWidth: 1.85,
    wheels: { front: 1.42, rear: -1.42, x: 1.06, rFront: 0.5, rRear: 0.5, width: 0.42 },
    extras: ['quadLights', 'bigWing', 'splitter', 'vents'],
  },
  bruiser: { // muscle car
    length: 5.0, width: 2.4,
    body:  [[-2.5, 0.34], [2.45, 0.34], [2.52, 0.92], [1.0, 1.04], [-1.3, 1.04], [-2.45, 1.0], [-2.52, 0.42]],
    cabin: [[0.9, 1.02], [0.2, 1.62], [-1.0, 1.62], [-1.55, 1.02]], cabinWidth: 1.9,
    wheels: { front: 1.6, rear: -1.6, x: 1.1, rFront: 0.5, rRear: 0.6, width: 0.5 },
    extras: ['stripes', 'scoop', 'ducktail', 'roundLights'],
  },
  zippy: {   // hot hatch
    length: 3.9, width: 2.2,
    body:  [[-1.92, 0.34], [1.86, 0.34], [1.96, 0.6], [1.86, 0.95], [0.9, 1.06], [-1.92, 1.06], [-1.98, 0.5]],
    cabin: [[0.95, 1.04], [0.3, 1.74], [-1.75, 1.74], [-1.92, 1.06]], cabinWidth: 1.85,
    wheels: { front: 1.25, rear: -1.25, x: 1.0, rFront: 0.46, rRear: 0.46, width: 0.4 },
    extras: ['roofWing', 'roundLights'],
  },
  dune: {    // dune buggy
    length: 3.9, width: 1.9,
    body:  [[-1.8, 0.55], [1.6, 0.55], [1.95, 0.85], [1.2, 0.98], [-1.6, 0.98], [-1.95, 0.72]],
    cabin: null,
    wheels: { front: 1.3, rear: -1.3, x: 1.25, rFront: 0.68, rRear: 0.78, width: 0.6 },
    extras: ['cage', 'roundLights'],
  },
  hauler: {  // van
    length: 4.9, width: 2.4,
    body:  [[-2.42, 0.34], [2.3, 0.34], [2.46, 0.7], [2.32, 1.2], [1.5, 2.4], [-2.42, 2.4], [-2.46, 0.4]],
    cabin: null,
    wheels: { front: 1.6, rear: -1.6, x: 1.06, rFront: 0.52, rRear: 0.52, width: 0.44 },
    extras: ['vanGlass', 'roofRack', 'roundLights'],
  },
};

function buildCarModel(modelId, paint, rimColor){
  const M = CAR_MODELS[modelId] || CAR_MODELS.furia;
  const group = new THREE.Group();
  const paintMat = new THREE.MeshStandardMaterial({ color: paint, metalness: 0.25, roughness: 0.28 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1b2333', metalness: 0.6, roughness: 0.12 });
  const trim = new THREE.MeshStandardMaterial({ color: '#16161d', metalness: 0.2, roughness: 0.6 });
  const head = new THREE.MeshStandardMaterial({ color: '#fff6d5', emissive: '#fff1b8', emissiveIntensity: 0.9 });
  const tail = new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 0.8 });
  const rim = new THREE.MeshStandardMaterial({ color: rimColor || '#c9ced6', metalness: 0.8, roughness: 0.25 });
  const W = M.width, L = M.length;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); group.add(m); return m; };
  const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  function extrude(points, width, bevel = 0.08){
    const sh = new THREE.Shape(); points.forEach(([u, v], i) => (i ? sh.lineTo(u, v) : sh.moveTo(u, v)));
    const depth = Math.max(0.05, width - bevel * 2);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
    g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals();
    return g;
  }
  add(extrude(M.body, W), paintMat);
  if (M.cabin) {
    add(extrude(M.cabin, M.cabinWidth, 0.06), glass);
    // painted roof panel along the top of the cabin
    const top = M.cabin.filter(p => p[1] > Math.max(...M.cabin.map(q => q[1])) - 0.05);
    if (top.length >= 2) {
      const z1 = Math.max(...top.map(p => p[0])), z2 = Math.min(...top.map(p => p[0])), y = top[0][1];
      add(boxG(M.cabinWidth - 0.1, 0.06, (z1 - z2) + 0.1), paintMat, 0, y + 0.03, (z1 + z2) / 2);
    }
  }
  // underside / sills so there is no gap above the road
  add(boxG(W - 0.2, 0.2, L - 0.6), trim, 0, 0.3, 0);

  const frontZ = Math.max(...M.body.map(p => p[0])), rearZ = Math.min(...M.body.map(p => p[0]));
  const frontY = M.body.find(p => p[0] === frontZ)[1];
  const ex = new Set(M.extras);
  // lights
  if (ex.has('roundLights')) {
    [-1, 1].forEach(s => {
      const hl = add(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 14), head, s * (W / 2 - 0.4), frontY + 0.12, frontZ + 0.02); hl.rotation.x = Math.PI / 2;
      add(boxG(0.45, 0.22, 0.06), tail, s * (W / 2 - 0.4), 0.75, rearZ - 0.02);
    });
  } else {
    [-1, 1].forEach(s => { const hl = add(boxG(0.55, 0.1, 0.25), head, s * (W / 2 - 0.42), frontY + 0.1, frontZ - 0.08); hl.rotation.x = -0.35; });
  }
  if (ex.has('lightbar')) add(boxG(W - 0.3, 0.1, 0.06), tail, 0, 0.82, rearZ - 0.02);
  if (ex.has('quadLights')) [-0.78, -0.45, 0.45, 0.78].forEach(x => { const t = add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), tail, x, 0.8, rearZ - 0.02); t.rotation.x = Math.PI / 2; });
  // body details
  if (ex.has('splitter')) add(boxG(W - 0.1, 0.06, 0.4), trim, 0, 0.36, frontZ - 0.1);
  if (ex.has('intakes')) [-1, 1].forEach(s => add(boxG(0.06, 0.32, 0.9), trim, s * (W / 2 + 0.04), 0.72, -0.55));
  if (ex.has('vents')) [-1, 1].forEach(s => add(boxG(0.06, 0.18, 0.5), trim, s * (W / 2 + 0.04), 0.75, 1.0));
  if (ex.has('lowWing')) { add(boxG(W - 0.3, 0.06, 0.4), trim, 0, 1.2, rearZ + 0.35); [-0.7, 0.7].forEach(x => add(boxG(0.08, 0.18, 0.2), trim, x, 1.09, rearZ + 0.35)); }
  if (ex.has('bigWing')) {
    add(boxG(W + 0.1, 0.07, 0.5), paintMat, 0, 1.5, rearZ + 0.32);
    [-1, 1].forEach(s => { add(boxG(0.08, 0.5, 0.3), trim, s * 0.75, 1.24, rearZ + 0.32); add(boxG(0.05, 0.3, 0.55), trim, s * (W / 2 + 0.07), 1.46, rearZ + 0.32); });
  }
  if (ex.has('ducktail')) add(boxG(W - 0.2, 0.12, 0.35), paintMat, 0, 1.1, rearZ + 0.25);
  if (ex.has('roofWing')) add(boxG(1.75, 0.08, 0.45), paintMat, 0, 1.76, -1.75);
  if (ex.has('scoop')) add(boxG(0.7, 0.22, 1.0), trim, 0, 1.12, 1.4);
  if (ex.has('stripes')) [-0.28, 0.28].forEach(x => add(boxG(0.3, 0.02, L - 0.4), new THREE.MeshStandardMaterial({ color: '#f4f1de', roughness: 0.4 }), x, 1.05, 0));
  if (ex.has('cage')) {
    const tube = new THREE.MeshStandardMaterial({ color: '#2b2d42', metalness: 0.6, roughness: 0.35 });
    [[-0.75, 0.6], [0.75, 0.6], [-0.75, -0.9], [0.75, -0.9]].forEach(([x, z]) => add(boxG(0.12, 1.0, 0.12), tube, x, 1.45, z));
    add(boxG(1.62, 0.12, 0.12), tube, 0, 1.95, 0.6); add(boxG(1.62, 0.12, 0.12), tube, 0, 1.95, -0.9);
    [-0.75, 0.75].forEach(x => add(boxG(0.12, 0.12, 1.62), tube, x, 1.95, -0.15));
    add(boxG(1.0, 0.5, 0.7), trim, 0, 1.2, -0.3);
    add(boxG(W - 0.2, 0.14, 0.14), tube, 0, 0.7, frontZ + 0.1);
  }
  if (ex.has('vanGlass')) {
    add(extrude([[2.28, 1.24], [1.52, 2.32], [1.32, 2.32], [1.32, 1.24]], W + 0.02, 0), glass);
    [-1, 1].forEach(s => add(boxG(0.04, 0.6, 1.6), glass, s * (W / 2 + 0.02), 1.85, 0.2));
  }
  if (ex.has('roofRack')) { [-0.9, 0.9].forEach(x => add(boxG(0.08, 0.1, 3.4), trim, x, 2.5, -0.5)); [-1.6, -0.5, 0.6].forEach(z => add(boxG(1.9, 0.06, 0.08), trim, 0, 2.52, z)); }

  // wheels: tyre + rim + spokes so you can see them spin
  const wheels = [], pivots = [];
  const Wh = Object.assign({}, M.wheels); Wh.x = Math.max(Wh.x, W / 2 - Wh.width / 2 + 0.1);
  [[-Wh.x, Wh.front, Wh.rFront], [Wh.x, Wh.front, Wh.rFront], [-Wh.x, Wh.rear, Wh.rRear], [Wh.x, Wh.rear, Wh.rRear]].forEach(([x, z, r], i) => {
    const pivot = new THREE.Group(); pivot.position.set(x, r, z); group.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Wh.width, 20).rotateZ(Math.PI / 2), trim); spin.add(tyre);
    const side = x > 0 ? 1 : -1;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.04, 16).rotateZ(Math.PI / 2), rim); disc.position.x = side * (Wh.width / 2 + 0.01); spin.add(disc);
    [0, Math.PI / 3, -Math.PI / 3].forEach(a => { const sp = new THREE.Mesh(boxG(0.05, r * 1.15, 0.1), rim); sp.rotation.x = a; sp.position.x = side * (Wh.width / 2 + 0.03); spin.add(sp); });
    wheels.push({ spin, r }); if (i < 2) pivots.push(pivot);
  });

  const flameGeo = new THREE.ConeGeometry(0.32, 2, 10); flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb703', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [-0.55, 0.55].map(x => { const f = new THREE.Mesh(flameGeo, flameMat); f.position.set(x, 0.55, rearZ - 1.0); f.visible = false; group.add(f); return f; });
  return { group, wheels, pivots, flames, length: L, width: W };
}
