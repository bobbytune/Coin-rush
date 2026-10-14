// Coin Rush drivers: who sits in the car. Pick one on the driver screen before the garage.
// Each character is built from simple rounded shapes. Add your own by copying one of the
// entries in CHARACTERS and giving it a 'head' function.

// The drivers you can pick on the driver screen. Rivals get the others.
const CHARACTERS = [
  { id: 'house',  name: 'Chillhouse',   blurb: 'Pride of Solangeles. Bricks for brains, heart of gold.' },
  { id: 'ace',    name: 'Ace Turbo',    blurb: 'Pro racer. Never takes the helmet off. Suit matches the car.' },
  { id: 'robo',   name: 'Robo-9',       blurb: 'Calculates the racing line to twelve decimal places.' },
  { id: 'granny', name: 'Granny Gears', blurb: 'Eighty-four years young and still flooring it.' },
  { id: 'pill',   name: 'Captain Pill', blurb: 'Collected one boost too many and turned into one.' },
  { id: 'dino',   name: 'Dino Dave',    blurb: 'Tiny arms, huge right foot.' },
  { id: 'survivor', name: 'The Survivor', blurb: 'Calm, confident, reliable. Never seen without the bandana.' },
];

// colours for each character's clothes and skin
const CHARACTER_LOOKS = {
  house:  { top: '#8d93a8', legs: '#5b8fb0', shoes: '#7a4a2e', skin: '#d9b98c' },
  ace:    { top: '#e63946', legs: '#22223b', shoes: '#111111', skin: '#f1c9a5' },
  robo:   { top: '#9aa5b4', legs: '#6c7686', shoes: '#3b3f4f', skin: '#aeb6c2' },
  granny: { top: '#e07a9a', legs: '#6d4c8f', shoes: '#5a3a2a', skin: '#f1c9a5' },
  pill:   { top: '#2ec4b6', legs: '#1f4d3a', shoes: '#ffffff', skin: '#f2f5f3' },
  dino:   { top: '#5fbf5a', legs: '#4a9e47', shoes: '#4a9e47', skin: '#6fcf68' },
  survivor: { top: '#33362a', legs: '#2c2d27', shoes: '#1e1e1c', skin: '#7a4a32', arms: '#7a4a32', hands: '#232320', accent: '#c9be4f' },
};

// pose: 'seated' (hands on a steering wheel in front) or 'standing'
function buildCharacter(id, pose, tint){
  if (id === 'survivor') return buildSurvivor(pose);
  const look = Object.assign({}, CHARACTER_LOOKS[id] || CHARACTER_LOOKS.ace, tint && (id === 'ace' || !CHARACTER_LOOKS[id]) ? { top: tint } : {});   // only Ace's suit follows the paint
  const g = new THREE.Group();
  const std = (c, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.05 }, extra || {}));
  const M = { top: std(look.top), legs: std(look.legs), shoes: std(look.shoes), skin: std(look.skin), white: std('#ffffff'), black: std('#15131f', { roughness: 0.3 }) };
  const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); (parent || g).add(m); return m; };
  const sphere = (r, seg = 16) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
  const limb = (a, b, r, mat) => {   // rounded tube from point a to point b
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const m = add(new THREE.CylinderGeometry(r, r, len, 10), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    add(sphere(r, 10), mat, B.x, B.y, B.z);
    return m;
  };
  const standing = pose === 'standing', hip = standing ? 0.82 : 0;

  // legs (only when standing; in a car they're hidden inside the body)
  if (standing) {
    [-0.13, 0.13].forEach(x => { limb([x, hip, 0], [x, 0.12, 0.02], id === 'survivor' ? 0.115 : 0.1, M.legs); const s = add(sphere(0.12, 12), M.shoes, x, 0.08, 0.08); s.scale.set(id === 'survivor' ? 1.2 : 1, id === 'survivor' ? 0.75 : 0.6, 1.6);
      if (id === 'survivor') {
        const acc = std(look.accent);
        add(new THREE.BoxGeometry(0.16, 0.2, 0.08), acc, x, 0.44, 0.1);                 // knee pads
        add(new THREE.CylinderGeometry(0.125, 0.125, 0.05, 12), acc, x, 0.2, 0.01);       // boot straps
        add(new THREE.BoxGeometry(0.1, 0.12, 0.06), std('#3d3e35'), x + (x > 0 ? 0.1 : -0.1), 0.62, 0.02);  // cargo pockets
      } });
  }
  // body
  const torso = add(new THREE.CylinderGeometry(0.24, 0.28, 0.6, 16), M.top, 0, hip + 0.3, 0);
  add(sphere(0.24, 16), M.top, 0, hip + 0.6, 0).scale.set(1.05, 0.45, 0.9);
  if (id === 'dino') { const belly = add(sphere(0.2, 14), std('#d8f0a0'), 0, hip + 0.3, 0.12); belly.scale.set(1, 1.3, 0.5); }
  if (id === 'survivor') {
    const acc = std(look.accent), leather = std('#24241f', { roughness: 0.4 }), metal = std('#c9ccd1', { metalness: 0.8, roughness: 0.3 });
    torso.scale.set(1.12, 1, 1);                                                                  // broad build
    const sh = add(sphere(0.24, 16), M.top, 0, hip + 0.6, 0); sh.scale.set(1.35, 0.5, 0.95);       // wide shoulders
    add(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 18), leather, 0, hip + 0.04, 0);             // belt
    add(new THREE.BoxGeometry(0.1, 0.08, 0.03), metal, 0, hip + 0.04, 0.31);                      // buckle
    add(new THREE.BoxGeometry(0.12, 0.12, 0.07), leather, 0.24, hip + 0.06, 0.18);                // pouch
    const strap = add(new THREE.BoxGeometry(0.06, 0.78, 0.04), leather, 0, hip + 0.32, 0.27); strap.rotation.z = 0.62;   // cross strap
    add(new THREE.BoxGeometry(0.06, 0.035, 0.02), std('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), -0.06, hip + 0.42, 0.29);
    [[-0.12, 0.2], [0.12, 0.28]].forEach(([x, y]) => add(new THREE.BoxGeometry(0.12, 0.03, 0.02), acc, x, hip + y, 0.275));   // yellow trim on the vest
    const scarf = add(new THREE.ConeGeometry(0.3, 0.46, 3), acc, 0, hip + 0.5, 0.2); scarf.rotation.set(Math.PI + 0.25, Math.PI / 6 * 3, 0); scarf.scale.set(1.1, 1, 0.45);   // bandana knot hanging on the chest
    add(new THREE.TorusGeometry(0.17, 0.085, 8, 18).rotateX(Math.PI / 2), acc, 0, hip + 0.72, 0.02);
    const fold = add(sphere(0.2, 14), acc, 0, hip + 0.64, 0.12); fold.scale.set(1.3, 0.55, 0.9);
  }
  // arms: on the wheel when seated, by the sides when standing
  [-1, 1].forEach(s => {
    const shoulder = [s * 0.3, hip + 0.56, 0];
    const short = id === 'dino';
    const hand = standing ? [s * 0.36, hip + (short ? 0.32 : 0.12), short ? 0.12 : 0.04] : [s * 0.2, 0.44, short ? 0.3 : 0.46];
    limb(shoulder, hand, short ? 0.06 : (id === 'survivor' ? 0.09 : 0.075), look.arms ? std(look.arms) : M.top);
    add(sphere(id === 'survivor' ? 0.1 : 0.085, 10), id === 'robo' ? M.legs : (look.hands ? std(look.hands) : M.skin), ...hand);
    if (id === 'survivor') {
      const t = 0.32, bx = shoulder[0] + (hand[0] - shoulder[0]) * t, by = shoulder[1] + (hand[1] - shoulder[1]) * t, bz = shoulder[2] + (hand[2] - shoulder[2]) * t;
      if (s < 0) add(sphere(0.1, 12), std(look.accent), bx, by, bz).scale.set(1, 0.5, 1);       // armband
      const cx = shoulder[0] + (hand[0] - shoulder[0]) * 0.85, cy = shoulder[1] + (hand[1] - shoulder[1]) * 0.85, cz = shoulder[2] + (hand[2] - shoulder[2]) * 0.85;
      add(sphere(0.1, 12), std(look.hands), cx, cy, cz).scale.set(1, 0.7, 1);                       // glove cuff
    }
  });
  // head
  const head = new THREE.Group(); head.position.set(0, hip + 0.9, 0); g.add(head);
  const H = (geo, mat, x, y, z) => add(geo, mat, x, y, z, head);
  if (id === 'house') {
    const brick = std('#d9b98c'), mortar = std('#b99a6c');
    H(new THREE.BoxGeometry(0.6, 0.52, 0.56), brick, 0, 0.02, 0);
    [-0.12, 0.06].forEach(y => H(new THREE.BoxGeometry(0.61, 0.02, 0.57), mortar, 0, y, 0));
    const roof = H(new THREE.ConeGeometry(0.5, 0.36, 4), std('#b5523b'), 0, 0.46, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1.04, 1, 1);
    H(new THREE.BoxGeometry(0.1, 0.22, 0.1), std('#a9876a'), 0.17, 0.52, -0.08);
    [-0.13, 0.13].forEach(x => { H(new THREE.BoxGeometry(0.15, 0.15, 0.02), M.white, x, 0.08, 0.285); H(new THREE.BoxGeometry(0.05, 0.08, 0.02), M.black, x, 0.07, 0.297); });
    H(sphere(0.06, 12), std('#e8743b'), 0, -0.04, 0.31);
    const smile = H(new THREE.TorusGeometry(0.08, 0.015, 6, 12, Math.PI), M.black, 0, -0.1, 0.285); smile.rotation.z = Math.PI;
  } else if (id === 'ace') {
    H(sphere(0.3, 20), std(look.top, { roughness: 0.25, metalness: 0.3 }), 0, 0, 0);
    const visor = H(sphere(0.305, 20), std('#1b2333', { roughness: 0.05, metalness: 0.7 }), 0, 0.02, 0.02); visor.scale.set(0.92, 0.42, 0.95);
    const stripe = H(new THREE.TorusGeometry(0.3, 0.025, 6, 24), M.white, 0, 0, 0); stripe.rotation.y = Math.PI / 2;
  } else if (id === 'robo') {
    H(new THREE.BoxGeometry(0.5, 0.42, 0.44), std('#aeb6c2', { metalness: 0.6, roughness: 0.3 }), 0, 0, 0);
    H(new THREE.BoxGeometry(0.4, 0.1, 0.02), std('#4de8e0', { emissive: '#4de8e0', emissiveIntensity: 0.9 }), 0, 0.04, 0.225);
    H(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), M.black, 0, 0.32, 0);
    H(sphere(0.045, 10), std('#ff3b3b', { emissive: '#ff3b3b', emissiveIntensity: 0.8 }), 0, 0.44, 0);
    [-1, 1].forEach(s => H(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12).rotateZ(Math.PI / 2), M.black, s * 0.27, 0, 0));
  } else if (id === 'granny') {
    H(sphere(0.26, 18), M.skin, 0, 0, 0);
    const hair = H(sphere(0.275, 18), std('#d9d9d9'), 0, 0.06, -0.04); hair.scale.set(1, 0.85, 1);
    H(sphere(0.12, 12), std('#d9d9d9'), 0, 0.26, -0.12);
    [-0.09, 0.09].forEach(x => { const r = H(new THREE.TorusGeometry(0.06, 0.012, 6, 16), M.black, x, 0.02, 0.25); });
    H(new THREE.BoxGeometry(0.06, 0.012, 0.012), M.black, 0, 0.03, 0.25);
    const smile = H(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), std('#b5523b'), 0, -0.1, 0.235); smile.rotation.z = Math.PI;
  } else if (id === 'pill') {
    const green = std('#4cc38a'), cream = std('#f2f5f3');
    H(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 18), green, 0, -0.08, 0); H(sphere(0.22, 18), green, 0, -0.18, 0);
    H(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 18), cream, 0, 0.12, 0); H(sphere(0.22, 18), cream, 0, 0.22, 0);
    H(new THREE.TorusGeometry(0.225, 0.02, 6, 24).rotateX(Math.PI / 2), std('#1f4d3a'), 0, 0.02, 0);
    [-0.08, 0.08].forEach(x => H(sphere(0.035, 10), M.black, x, 0.12, 0.2));
    const smile = H(new THREE.TorusGeometry(0.07, 0.014, 6, 12, Math.PI), M.black, 0, -0.04, 0.205); smile.rotation.z = Math.PI;
  } else if (id === 'survivor') {
    const skin = M.skin, dark = std('#16120f', { roughness: 0.9 });
    const face = H(sphere(0.25, 20), skin, 0, 0, 0); face.scale.set(0.92, 1.12, 0.98);
    const jaw = H(sphere(0.2, 16), skin, 0, -0.12, 0.04); jaw.scale.set(1.0, 0.75, 0.9);
    const hair = H(new THREE.SphereGeometry(0.245, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), dark, 0, 0.06, -0.03); hair.scale.set(0.97, 1.05, 1.0);   // short cropped hair on top only
    [-1, 1].forEach(e => {
      H(sphere(0.05, 10), skin, e * 0.235, 0.0, -0.01);                                                // ears
      H(sphere(0.03, 10), std('#ffffff'), e * 0.085, 0.05, 0.215); H(sphere(0.02, 8), dark, e * 0.085, 0.05, 0.235);   // eyes
      const brow = H(new THREE.BoxGeometry(0.09, 0.022, 0.03), dark, e * 0.09, 0.105, 0.225); brow.rotation.z = e * -0.18;
    });
    H(sphere(0.04, 10), skin, 0, -0.03, 0.25);                                                          // nose
    const mo = H(new THREE.BoxGeometry(0.14, 0.03, 0.03), dark, 0, -0.11, 0.225);                        // moustache
    H(new THREE.BoxGeometry(0.06, 0.1, 0.04), dark, 0, -0.21, 0.2);                                     // goatee
    [-1, 1].forEach(e => { const g2 = H(new THREE.BoxGeometry(0.025, 0.1, 0.03), dark, e * 0.075, -0.15, 0.215); g2.rotation.z = e * 0.2; });
  } else if (id === 'dino') {
    const skin = M.skin;
    H(sphere(0.26, 18), skin, 0, 0, 0);
    const snout = H(sphere(0.2, 16), skin, 0, -0.05, 0.22); snout.scale.set(1, 0.75, 1.1);
    [-0.1, 0.1].forEach(x => { H(sphere(0.07, 10), M.white, x, 0.17, 0.13); H(sphere(0.035, 8), M.black, x, 0.18, 0.19); H(sphere(0.018, 6), M.black, x * 0.4, -0.02, 0.43); });
    [0, 1, 2].forEach(k => { const c = H(new THREE.ConeGeometry(0.06, 0.14, 8), std('#ffb703'), 0, 0.24 - k * 0.1, -0.2 - k * 0.06); c.rotation.x = -0.6 - k * 0.3; });
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// ---- The Survivor: realistic proportions (slim, athletic), built separately from the cartoon drivers ----
function buildSurvivor(pose){
  const g = new THREE.Group(), seated = pose !== 'standing';
  const std = (c, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.02 }, extra || {}));
  const skin = std('#7a4a32', { roughness: 0.5 }), vest = std('#33362a', { roughness: 0.75 }), pants = std('#2c2d27', { roughness: 0.85 });
  const leather = std('#22221e', { roughness: 0.45 }), acc = std('#c9be4f', { roughness: 0.7 }), dark = std('#15110e', { roughness: 0.9 });
  const metal = std('#c9ccd1', { metalness: 0.85, roughness: 0.3 }), sole = std('#121210', { roughness: 0.9 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (geo, mat, p, parent) => { const m = new THREE.Mesh(geo, mat); if (p) m.position.copy(p); (parent || g).add(m); return m; };
  const blob = (r, mat, p, sx = 1, sy = 1, sz = 1, parent) => { const m = add(new THREE.SphereGeometry(r, 20, 14), mat, p, parent); m.scale.set(sx, sy, sz); return m; };
  // tapered tube between two points, with rounded joints
  const seg = (a, b, r1, r2, mat) => {
    const len = a.distanceTo(b), m = add(new THREE.CylinderGeometry(r2, r1, len, 16), mat, a.clone().add(b).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    blob(r2, mat, b); return m;
  };
  const lerp = (a, b, t) => a.clone().lerp(b, t);

  // skeleton points
  const hipY = seated ? 0.02 : 0.93, waistY = hipY + 0.13, chestY = hipY + 0.38, shY = hipY + 0.52;
  const P = seated ? {
    hip: [V(-0.1, hipY, 0), V(0.1, hipY, 0)], knee: [V(-0.12, hipY + 0.05, 0.45), V(0.12, hipY + 0.05, 0.45)], ankle: [V(-0.12, hipY - 0.35, 0.55), V(0.12, hipY - 0.35, 0.55)],
    sh: [V(-0.235, shY, -0.02), V(0.235, shY, -0.02)], elbow: [V(-0.26, hipY + 0.28, 0.2), V(0.26, hipY + 0.28, 0.2)], wrist: [V(-0.19, hipY + 0.42, 0.42), V(0.19, hipY + 0.42, 0.42)],
  } : {
    hip: [V(-0.1, hipY, 0), V(0.1, hipY, 0)], knee: [V(-0.11, 0.5, 0.02), V(0.11, 0.5, 0.02)], ankle: [V(-0.115, 0.1, 0), V(0.115, 0.1, 0)],
    sh: [V(-0.235, shY, 0), V(0.235, shY, 0)], elbow: [V(-0.28, shY - 0.28, -0.02), V(0.28, shY - 0.28, -0.02)], wrist: [V(-0.3, shY - 0.53, 0.03), V(0.3, shY - 0.53, 0.03)],
  };

  // torso: shaped chest narrowing to the waist (vest), with the belt and pelvis
  const prof = [[0.01, 0], [0.135, 0], [0.14, 0.06], [0.135, 0.13], [0.15, 0.22], [0.172, 0.3], [0.178, 0.36], [0.17, 0.41], [0.13, 0.46], [0.07, 0.49], [0.01, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = add(new THREE.LatheGeometry(prof, 24), vest, V(0, hipY + 0.03, 0)); torso.scale.set(1.32, 1, 0.85);
  blob(0.13, pants, V(0, hipY + 0.02, 0), 1.25, 0.6, 0.85);
  const belt = add(new THREE.TorusGeometry(0.155, 0.022, 8, 24).rotateX(Math.PI / 2), leather, V(0, waistY - 0.06, 0)); belt.scale.set(1.08, 1, 0.82);
  add(new THREE.BoxGeometry(0.06, 0.045, 0.02), metal, V(0, waistY - 0.06, 0.13));
  blob(0.04, leather, V(0.15, waistY - 0.07, 0.08), 1, 1.1, 0.7);
  // vest details: cross strap, little light, yellow trim
  const strap = add(new THREE.BoxGeometry(0.035, 0.5, 0.02), leather, V(0, chestY - 0.06, 0.138)); strap.rotation.z = 0.68;
  add(new THREE.BoxGeometry(0.035, 0.02, 0.012), std('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.7 }), V(-0.04, chestY - 0.02, 0.15));
  add(new THREE.BoxGeometry(0.08, 0.018, 0.01), acc, V(-0.07, chestY - 0.13, 0.138));

  // neck, bandana
  seg(V(0, shY - 0.04, 0), V(0, shY + 0.07, 0.01), 0.052, 0.048, skin);
  const band = add(new THREE.TorusGeometry(0.075, 0.035, 10, 22).rotateX(Math.PI / 2), acc, V(0, shY + 0.0, 0.01)); band.scale.set(1.25, 1, 1.1);
  const knot = add(new THREE.ConeGeometry(0.11, 0.2, 3), acc, V(0, shY - 0.09, 0.115)); knot.rotation.set(Math.PI + 0.3, Math.PI / 2, 0); knot.scale.set(1.2, 1, 0.35);

  // arms: deltoids, upper arm, forearm, fingerless gloves
  [0, 1].forEach(i => {
    const s = i ? 1 : -1, sh = P.sh[i], el = P.elbow[i], wr = P.wrist[i];
    blob(0.08, vest, sh.clone().add(V(-s * 0.03, 0.01, 0)), 1.1, 0.75, 1.05);   // vest shoulder
    blob(0.072, skin, sh.clone().add(V(s * 0.012, -0.03, 0)), 1, 1.1, 1);
    seg(sh, el, 0.066, 0.05, skin);
    seg(el, wr, 0.05, 0.04, skin);
    if (s < 0) { const ab = add(new THREE.TorusGeometry(0.052, 0.016, 8, 18), acc, lerp(sh, el, 0.35)); ab.quaternion.setFromUnitVectors(V(0, 0, 1), el.clone().sub(sh).normalize()); }
    const cuff = add(new THREE.CylinderGeometry(0.044, 0.04, 0.08, 14), leather, lerp(el, wr, 0.82)); cuff.quaternion.setFromUnitVectors(V(0, 1, 0), wr.clone().sub(el).normalize());
    const hand = blob(0.045, leather, wr.clone().add(wr.clone().sub(el).normalize().multiplyScalar(0.05)), 0.8, 1.15, 0.6);
    hand.quaternion.setFromUnitVectors(V(0, 1, 0), wr.clone().sub(el).normalize());
    blob(0.02, skin, wr.clone().add(wr.clone().sub(el).normalize().multiplyScalar(0.1)), 1.6, 1, 0.8);   // bare fingertips
  });

  // legs: thighs, knees with yellow pads, shins, boots
  [0, 1].forEach(i => {
    const s = i ? 1 : -1, hp = P.hip[i], kn = P.knee[i], an = P.ankle[i];
    seg(hp, kn, 0.085, 0.064, pants);
    seg(kn, an, 0.064, 0.058, pants);
    blob(0.035, std('#3d3e35'), lerp(hp, kn, 0.45).add(V(s * 0.07, 0, 0.0)), 0.6, 1.3, 1);   // cargo pocket
    const pad = blob(0.058, acc, kn.clone().add(V(0, -0.02, 0.055)), 1, 1.5, 0.55);
    const dir = an.clone().sub(kn).normalize(); pad.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().multiplyScalar(-1));
    const boot = blob(0.08, leather, an.clone().add(V(0, -0.035, 0.05)), 1.05, 0.95, 1.7);
    seg(an.clone().add(V(0, -0.02, 0)), an.clone().add(V(0, 0.1, 0)), 0.07, 0.068, leather);   // boot shaft
    blob(0.082, sole, an.clone().add(V(0, -0.085, 0.05)), 1.12, 0.3, 1.8);
    add(new THREE.TorusGeometry(0.072, 0.016, 8, 18).rotateX(Math.PI / 2), acc, an.clone().add(V(0, 0.05, 0)));
  });

  // head: oval skull, jaw, ears, nose, brows, eyes, cropped hair, moustache and goatee
  const head = new THREE.Group(); head.position.set(0, shY + 0.2, 0.02); g.add(head);
  blob(0.105, skin, V(0, 0.01, 0), 0.92, 1.18, 1.0, head);
  blob(0.08, skin, V(0, -0.065, 0.025), 0.98, 0.72, 0.95, head);
  const hair = add(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), dark, V(0, 0.035, -0.008), head); hair.scale.set(0.95, 1.2, 1.03);
  [-1, 1].forEach(e => {
    blob(0.022, skin, V(e * 0.09, 0.0, -0.005), 0.55, 1, 0.9, head);
    blob(0.011, std('#f2efe8'), V(e * 0.034, 0.022, 0.087), 1.3, 0.8, 0.6, head);
    blob(0.007, dark, V(e * 0.034, 0.022, 0.093), 1, 1, 0.6, head);
    const brow = add(new THREE.BoxGeometry(0.036, 0.009, 0.012), dark, V(e * 0.036, 0.045, 0.092), head); brow.rotation.z = e * -0.15;
    const side = add(new THREE.BoxGeometry(0.01, 0.045, 0.012), dark, V(e * 0.03, -0.075, 0.083), head); side.rotation.z = e * 0.25;
  });
  blob(0.018, skin, V(0, -0.005, 0.1), 0.9, 1.1, 0.9, head);
  add(new THREE.BoxGeometry(0.055, 0.01, 0.012), dark, V(0, -0.045, 0.092), head);
  blob(0.02, dark, V(0, -0.105, 0.075), 0.8, 1.3, 0.7, head);

  if (seated) g.scale.setScalar(1.3);   // match the cartoon drivers' size so he's visible over the dash
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}
