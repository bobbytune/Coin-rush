// Coin Rush drivers: who sits in the car. Pick one on the driver screen before the garage.
// Each character is built from simple rounded shapes. Add your own by copying one of the
// entries in CHARACTERS and giving it a 'head' function.

// For now everyone drives as the default racer, whose helmet and suit match their car's paint.
// When you add more characters here, a driver select screen appears automatically before the garage.
// Example heads already built below that you can switch on: 'house', 'robo', 'granny', 'pill', 'dino'.
const CHARACTERS = [
  { id: 'ace', name: 'Racer', blurb: 'The default driver. Helmet on, foot down.' },
  // { id: 'house', name: 'House Guy', blurb: 'Straight out of Solangeles.' },
];

// colours for each character's clothes and skin
const CHARACTER_LOOKS = {
  house:  { top: '#8d93a8', legs: '#5b8fb0', shoes: '#7a4a2e', skin: '#d9b98c' },
  ace:    { top: '#e63946', legs: '#22223b', shoes: '#111111', skin: '#f1c9a5' },
  robo:   { top: '#9aa5b4', legs: '#6c7686', shoes: '#3b3f4f', skin: '#aeb6c2' },
  granny: { top: '#e07a9a', legs: '#6d4c8f', shoes: '#5a3a2a', skin: '#f1c9a5' },
  pill:   { top: '#2ec4b6', legs: '#1f4d3a', shoes: '#ffffff', skin: '#f2f5f3' },
  dino:   { top: '#5fbf5a', legs: '#4a9e47', shoes: '#4a9e47', skin: '#6fcf68' },
};

// pose: 'seated' (hands on a steering wheel in front) or 'standing'
function buildCharacter(id, pose, tint){
  const look = Object.assign({}, CHARACTER_LOOKS[id] || CHARACTER_LOOKS.ace, tint ? { top: tint } : {});
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
    [-0.13, 0.13].forEach(x => { limb([x, hip, 0], [x, 0.12, 0.02], 0.1, M.legs); const s = add(sphere(0.12, 12), M.shoes, x, 0.08, 0.08); s.scale.set(1, 0.6, 1.6); });
  }
  // body
  const torso = add(new THREE.CylinderGeometry(0.24, 0.28, 0.6, 16), M.top, 0, hip + 0.3, 0);
  add(sphere(0.24, 16), M.top, 0, hip + 0.6, 0).scale.set(1.05, 0.45, 0.9);
  if (id === 'dino') { const belly = add(sphere(0.2, 14), std('#d8f0a0'), 0, hip + 0.3, 0.12); belly.scale.set(1, 1.3, 0.5); }
  // arms: on the wheel when seated, by the sides when standing
  [-1, 1].forEach(s => {
    const shoulder = [s * 0.3, hip + 0.56, 0];
    const short = id === 'dino';
    const hand = standing ? [s * 0.36, hip + (short ? 0.32 : 0.12), short ? 0.12 : 0.04] : [s * 0.2, 0.44, short ? 0.3 : 0.46];
    limb(shoulder, hand, short ? 0.06 : 0.075, M.top);
    add(sphere(0.085, 10), id === 'robo' ? M.legs : M.skin, ...hand);
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
