import * as THREE from './vendor/three.module.js';

// A single deterministic material/geometry set keeps the courtyard inexpensive.
const TAU = Math.PI * 2;
function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
function texture(c, color = true) { const t = new THREE.CanvasTexture(c); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function stoneTextures() {
  const r = random(821), size = 2048, c = canvas(size), b = canvas(size), rough = canvas(size);
  const ctx = c.getContext('2d'), bump = b.getContext('2d'), rc = rough.getContext('2d');
  ctx.fillStyle = '#171e20'; ctx.fillRect(0, 0, size, size); bump.fillStyle = '#121212'; bump.fillRect(0, 0, size, size); rc.fillStyle = '#858585'; rc.fillRect(0, 0, size, size);
  const h = 72, w = 120;
  for (let row = -1; row < 29; row++) for (let col = -1; col < 19; col++) {
    const x = col * w + (row % 2) * w / 2, y = row * h, inset = 1.5 + r() * 1.5;
    const path = new Path2D(); path.moveTo(x + inset + r() * 8, y + inset); path.lineTo(x + w - inset, y + inset + r() * 6); path.lineTo(x + w - inset - r() * 6, y + h - inset); path.lineTo(x + inset, y + h - inset - r() * 7); path.closePath();
    const shade = 49 + Math.floor(r() * 20); ctx.fillStyle = `rgb(${shade - 5},${shade + 1},${shade + 5})`; ctx.fill(path);
    ctx.strokeStyle = '#8d979b28'; ctx.lineWidth = 1.5; ctx.stroke(path);
    bump.fillStyle = `rgb(${160 + Math.floor(r() * 40)},${180},${180})`; bump.fill(path); bump.lineWidth = 5; bump.strokeStyle = '#585858'; bump.stroke(path);
    const wet = 75 + Math.floor(r() * 110); rc.fillStyle = `rgb(${wet},${wet},${wet})`; rc.fill(path);
    ctx.strokeStyle = '#0f171a88'; ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); let px = x + r() * w, py = y + inset; ctx.moveTo(px, py);
    for (let k = 0; k < 5; k++) { px += (r() - .5) * 48; py += h / 5; ctx.lineTo(px, py); } ctx.stroke();
  }
  // Water stains and mineral patches at several scales interrupt the regular paving.
  for (let i = 0; i < 1600; i++) {
    const x = r() * size, y = r() * size, radius = 4 + r() * 68;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, i % 4 ? '#050f1640' : '#9ba9a52b'); g.addColorStop(1, '#18232a00'); ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    if (i % 7 === 0) { const wet = rc.createRadialGradient(x, y, 0, x, y, radius); wet.addColorStop(0, '#272727cc'); wet.addColorStop(1, '#77777700'); rc.fillStyle = wet; rc.fillRect(x - radius, y - radius, radius * 2, radius * 2); }
  }
  // Fine mineral variation, independent from the larger chipped joints.
  const pixels = ctx.getImageData(0, 0, size, size), bp = bump.getImageData(0, 0, size, size);
  for (let i = 0; i < pixels.data.length; i += 4) { const n = (r() - .5) * 19; for (let k = 0; k < 3; k++) { pixels.data[i + k] += n; bp.data[i + k] += n * .8; } }
  ctx.putImageData(pixels, 0, 0); bump.putImageData(bp, 0, 0);
  for (let i = 0; i < 150; i++) { const x = r() * size, y = r() * size; const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12 + r() * 45); gradient.addColorStop(0, '#65704b25'); gradient.addColorStop(1, '#334a3400'); ctx.fillStyle = gradient; ctx.fillRect(x - 60, y - 60, 120, 120); }
  // Worn ritual seal: an engraving, not a glowing combat marker.
  ctx.strokeStyle = '#b9a77928'; ctx.lineWidth = 3;
  for (const radius of [388, 401, 455]) { ctx.beginPath(); ctx.arc(1024, 1024, radius, 0, TAU); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(1024, 1024); ctx.rotate(i * TAU / 8); for (let j = 0; j < 3; j++) { const y = 412 + j * 12; ctx.fillStyle = '#a697732e'; if ((i >> j) & 1) ctx.fillRect(-21, y, 42, 4); else { ctx.fillRect(-21, y, 17, 4); ctx.fillRect(4, y, 17, 4); } } ctx.restore(); }
  return { map: texture(c), bumpMap: texture(b, false), roughnessMap: texture(rough, false) };
}
export function agedTexture(kind) {
  const c = canvas(512), ctx = c.getContext('2d'), r = random(kind === 'wood' ? 901 : 143);
  ctx.fillStyle = kind === 'wood' ? '#482a25' : '#4e5453'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8500; i++) { ctx.fillStyle = i % 3 ? '#02090818' : '#d1baa215'; const x = r() * 512, y = r() * 512; ctx.fillRect(x, y, kind === 'wood' ? .6 + r() * 2 : r() * 7, kind === 'wood' ? 4 + r() * 85 : r() * 4); }
  return texture(c);
}

export function buildTemple(world, mountainGeometry) {
  const scene = world.scene, r = random(713), batches = new Map(), box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const stoneMap = agedTexture('stone'), woodMap = agedTexture('wood');
  const stone = new THREE.MeshStandardMaterial({ color: '#8b9596', map: stoneMap, bumpMap: stoneMap, bumpScale: .055, roughness: .87 });
  const wood = new THREE.MeshStandardMaterial({ color: '#b6917f', map: woodMap, bumpMap: woodMap, bumpScale: .035, roughness: .73 });
  const tile = new THREE.MeshStandardMaterial({ color: '#26363c', map: stoneMap, roughness: .49, metalness: .15 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#7a6340', roughness: .6, metalness: .72 });
  const black = new THREE.MeshStandardMaterial({ color: '#101b1d', roughness: .83 });
  const glow = new THREE.MeshStandardMaterial({ color: '#dca268', emissive: '#ff8327', emissiveIntensity: 3, roughness: .8 });
  function emit(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const key = `${geo.uuid}:${mat.uuid}`; if (!batches.has(key)) batches.set(key, { geo, mat, matrices: [] });
    const obj = new THREE.Object3D(); obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz); obj.scale.set(sx, sy, sz); obj.updateMatrix(); batches.get(key).matrices.push(obj.matrix.clone());
  }
  function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true; scene.add(m); return m; }
  function beam(a, b, radius, mat = tile) { const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), d = q.clone().sub(p), obj = new THREE.Object3D(); obj.position.copy(p.add(q).multiplyScalar(.5)); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); obj.scale.set(radius, d.length(), radius); obj.updateMatrix(); const key = `${cyl.uuid}:${mat.uuid}`; if (!batches.has(key)) batches.set(key, { geo: cyl, mat, matrices: [] }); batches.get(key).matrices.push(obj.matrix.clone()); }
  const groundMat = new THREE.MeshPhysicalMaterial({ ...stoneTextures(), color: '#bec5c6', bumpScale: .065, roughness: .84, metalness: .04, clearcoat: .22, clearcoatRoughness: .32 });
  world.groundMaterial=groundMat;
  const floor = mesh(new THREE.CircleGeometry(12.5, 128), groundMat, 0, .005, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  mesh(new THREE.CylinderGeometry(12.5, 12.8, .75, 96), stone, 0, -.385, 0);
  const outside = mesh(new THREE.CircleGeometry(110, 64), new THREE.MeshStandardMaterial({ color: '#182529', roughness: .95 }), 0, -.8, 0); outside.rotation.x = -Math.PI / 2; outside.castShadow = false;
  for (let i = 0; i < 76; i++) { const a = i * TAU / 76; emit(box, stone, Math.sin(a) * 12.55, -.04, Math.cos(a) * 12.55, .98, .32, .62, 0, a); }
  for (let i = 0; i < 10; i++) emit(box, stone, 0, -.5 + i * .07, -12.9 - i * .35, 7.5, .2, .5);
  // Roof surfaces and individual half-round tile runs share a handful of draws.
  function roof(cx, cy, cz, w, d, rise) {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let face = 0; face < 4; face++) {
      const a = corners[face], b = corners[(face + 1) % 4], cols = face % 2 ? 24 : 52, rows = 9, verts = [], uv = [], ids = [];
      function point(u, v) { const x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u; return [cx + x * w * (.48 + .52 * v), cy + rise * Math.pow(1 - v, 1.75) + .34 * Math.pow(Math.abs(x * z), 8) * v * v, cz + z * d * (.035 + .965 * v)]; }
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { verts.push(...point(i / cols, j / rows)); uv.push(i / cols * 3, j / rows); }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * (cols + 1) + i; ids.push(k, k + cols + 1, k + 1, k + 1, k + cols + 1, k + cols + 2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(ids); geo.computeVertexNormals(); const surface = mesh(geo, tile); surface.material.side = THREE.DoubleSide;
      for (let i = 0; i <= cols; i++) for (let j = 0; j < rows; j++) { const start = point(i / cols, j / rows), end = point(i / cols, (j + 1) / rows); start[1] += .035; end[1] += .035; beam(start, end, .047); }
      for (let i = 0; i < cols; i++) beam(point(i / cols, 1), point((i + 1) / cols, 1), .09, bronze);
    }
    beam([cx - w * .56, cy + rise + .1, cz], [cx + w * .56, cy + rise + .1, cz], .13, stone);
    for (const sign of [-1, 1]) { beam([cx + sign * w * .53, cy + rise + .1, cz], [cx + sign * w * .62, cy + rise + .52, cz], .1, stone); }
  }
  // A substantial two-tier temple facade, lattice screens and worn vermilion pillars.
  emit(box, stone, 0, .1, -18, 13.7, 1.2, 7);
  emit(box, black, 0, 2.8, -19, 12.4, 4.7, 2.5);
  for (const x of [-5.6, -3.2, 3.2, 5.6]) {
    emit(cyl, wood, x, 2.9, -15.8, .24, 5, .24); emit(box, stone, x, .65, -15.8, .88, .55, .85); emit(cyl, bronze, x, 1.05, -15.8, .255, .12, .255);
    for (const y of [4.5, 4.8, 5.1]) emit(box, wood, x, y, -15.8, 1.1 + (y - 4.5) * 1.7, .15, 1.35);
  }
  emit(box, wood, 0, 4.55, -15.8, 12.4, .35, .55); emit(box, wood, 0, 5.15, -17.5, 13, .25, 4.6);
  for (const x of [-4.5, 4.5]) {
    emit(box, glow, x, 2.8, -17.67, 1.5, 2.1, .06);
    for (let i = -4; i <= 4; i++) emit(box, wood, x + i * .19, 2.8, -17.6, .075, 2.3, .12);
    for (let i = -4; i <= 4; i++) emit(box, wood, x, 2.8 + i * .26, -17.55, 1.7, .07, .14);
  }
  for (const x of [-1.1, 1.1]) { emit(box, wood, x, 2.4, -17.6, 2.15, 3.9, .18); for (let y = 1; y <= 3.7; y += .45) for (let j = -1; j <= 1; j++) emit(cyl, bronze, x + j * .62, y, -17.47, .055, .08, .055, Math.PI / 2); }
  const plaqueCanvas = canvas(512); plaqueCanvas.height = 208; const pc = plaqueCanvas.getContext('2d'); pc.fillStyle = '#172021'; pc.fillRect(0, 0, 512, 512); pc.strokeStyle = '#a38b57'; pc.lineWidth = 8; pc.strokeRect(14, 14, 484, 180); pc.fillStyle = '#c9af77'; pc.textAlign = 'center'; pc.font = '92px "Songti TC", serif'; pc.fillText('鎮 祟 寺', 256, 135);
  mesh(new THREE.PlaneGeometry(3.2, 1.3), new THREE.MeshStandardMaterial({ map: texture(plaqueCanvas), roughness: .85 }), 0, 4.45, -15.44);
  roof(0, 5.35, -18, 7.2, 3.9, 1.8);
  emit(box, wood, 0, 7.1, -18.2, 7, 1.7, 3.5); roof(0, 7.85, -18.2, 4.8, 2.8, 1.6);
  // Side galleries enclose the space without putting collision-less props in the arena.
  for (const sign of [-1, 1]) {
    emit(box, stone, sign * 16.3, 1.4, -5, 1.3, 4.1, 23);
    for (let z = -14; z <= 6; z += 4) { emit(cyl, wood, sign * 15.5, 2.2, z, .2, 4.8, .2); emit(box, stone, sign * 15.5, .05, z, .7, .5, .7); }
    emit(box, wood, sign * 15.5, 4.5, -4.5, .35, .35, 24);
    roof(sign * 16.2, 4.7, -4, 2.1, 12.5, .9);
  }
  const bannerCanvas = canvas(256); bannerCanvas.height = 768; const bc = bannerCanvas.getContext('2d'); bc.fillStyle = '#642e23'; bc.fillRect(0, 0, 256, 768); bc.strokeStyle = '#b89c5d'; bc.lineWidth = 4; bc.strokeRect(24, 20, 208, 690); bc.fillStyle = '#c5ad71'; bc.font = '64px "Songti TC", serif'; bc.textAlign = 'center'; ['敕', '令', '鎮', '祟'].forEach((v, i) => bc.fillText(v, 128, 140 + i * 140));
  const bannerMat = new THREE.MeshStandardMaterial({ map: texture(bannerCanvas), roughness: 1, side: THREE.DoubleSide });
  for (const sign of [-1, 1]) { const g = new THREE.PlaneGeometry(.57, 2.7, 6, 16), a = g.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i); a.setZ(i, Math.sin(y * 4 + sign) * .055); if (y < -1.3) a.setY(i, y + r() * .22); } g.computeVertexNormals(); mesh(g, bannerMat, sign * 3.2, 3.05, -15.46); }
  const leafGeo = new THREE.CircleGeometry(1, 5), leafMat = new THREE.MeshStandardMaterial({ color: '#77604a', roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 190; i++) { const a = r() * TAU, radius = 8.3 + r() * 4; emit(leafGeo, leafMat, Math.sin(a) * radius, .025, Math.cos(a) * radius, .025 + r() * .06, .05 + r() * .06, 1, -Math.PI / 2, 0, r() * TAU); }
  const haloCanvas = canvas(128), hc = haloCanvas.getContext('2d'), hg = hc.createRadialGradient(64, 64, 0, 64, 64, 64); hg.addColorStop(0, 'rgba(255,168,74,.6)'); hg.addColorStop(.2, 'rgba(255,103,24,.17)'); hg.addColorStop(1, 'rgba(255,80,10,0)'); hc.fillStyle = hg; hc.fillRect(0, 0, 128, 128); const haloMap = texture(haloCanvas);
  // Soft local contact occlusion complements the distant directional shadow map.
  const shadowCanvas = canvas(128), sc = shadowCanvas.getContext('2d'), sg = sc.createRadialGradient(64, 64, 5, 64, 64, 64); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(.4, 'rgba(0,0,0,.28)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); sc.fillStyle = sg; sc.fillRect(0, 0, 128, 128);
  const shadowMap = texture(shadowCanvas); world.contactShadows = [1.65, 2.65].map(size => { const m = mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }), 0, .018, 0); m.rotation.x = -Math.PI / 2; m.castShadow = m.receiveShadow = false; return m; });
  world.fireLights = [];
  for (const [x, z] of [[-9, -8], [9, -8], [-10, 6], [10, 6], [-3, -15.1], [3, -15.1]]) {
    emit(box, stone, x, .1, z, .85, .3, .85); emit(cyl, stone, x, .75, z, .16, 1.1, .16); emit(box, bronze, x, 1.25, z, .64, .15, .64); emit(cyl, glow, x, 1.55, z, .22, .46, .22);
    for (const dx of [-.28, .28]) for (const dz of [-.28, .28]) emit(box, bronze, x + dx, 1.55, z + dz, .055, .6, .055);
    emit(box, bronze, x, 1.88, z, .8, .12, .8); emit(cyl, bronze, x, 2, z, .08, .22, .08);
    const light = new THREE.PointLight('#ff9c52', 16, 10, 2); light.position.set(x, 1.65, z); scene.add(light); world.fireLights.push(light);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloMap, transparent: true, opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.set(x, 1.6, z); halo.scale.set(2.2, 2.2, 1); scene.add(halo);
  }
  // Fogged rock silhouettes use rounded detail, avoiding the original flat polygons.
  const rockGeo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 58; i++) { const a = r() * TAU, radius = 18 + r() * 18; if (Math.cos(a) < -.75 || Math.cos(a)*radius>10&&Math.abs(Math.sin(a)*radius)<14) continue; emit(rockGeo, stone, Math.sin(a) * radius, -.5, Math.cos(a) * radius, 1 + r() * 2, .5 + r() * 2, .9 + r() * 2, r(), r(), r()); }
  const mountainMat = new THREE.MeshStandardMaterial({ color: '#273a40', roughness: 1 });
  for (let i = 0; i < 26; i++) { const a = i * TAU / 26, radius = 46 + r() * 30, h = 14 + r() * 28; if(Math.cos(a)*radius>10&&Math.abs(Math.sin(a)*radius)<19)continue;const m = mesh(mountainGeometry(5 + r() * 5, h), mountainMat, Math.sin(a) * radius, h * .3 - 7, Math.cos(a) * radius); m.rotation.y = r() * TAU; m.castShadow = false; }
  // Distant bare trees provide finer silhouettes; the old pancake pines are removed.
  const bark = new THREE.MeshStandardMaterial({ color: '#182729', roughness: 1 });
  for (let i = 0; i < 34; i++) { const a = r() * TAU, radius = 24 + r() * 18, x = Math.sin(a) * radius, z = Math.cos(a) * radius, h = 6 + r() * 7; if(z>10&&Math.abs(x)<14)continue;beam([x, -.7, z], [x + .6, h, z], .13 + r() * .12, bark); for (let j = 0; j < 5; j++) { const y = h * (.4 + j * .1), dx = (j % 2 ? 1 : -1) * (1 + r() * 2), dz = (r() - .5) * 3; beam([x + .3, y, z], [x + dx, y + 1.5, z + dz], .055, bark); beam([x + dx, y + 1.5, z + dz], [x + dx * 1.4, y + 2.3, z + dz * 1.2], .023, bark); } }
  for (const { geo, mat, matrices } of batches.values()) { const m = new THREE.InstancedMesh(geo, mat, matrices.length); matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix)); m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); }
  const rainPositions = new Float32Array(240 * 6); for (let i = 0; i < rainPositions.length; i += 6) { const x = r() * 40 - 20, y = r() * 16, z = r() * 40 - 20; rainPositions.set([x, y, z, x - .035, y + .42, z], i); }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3)); world.rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#8ea5b4', transparent: true, opacity: .13, depthWrite: false })); world.rain.frustumCulled = false; scene.add(world.rain);
}

export function updateTemple(world, dt, t, actors) {
  world.contactShadows.forEach((shadow, i) => { shadow.position.x = actors[i].x; shadow.position.z = actors[i].z; if (i === 1) shadow.scale.setScalar(world.enemyKind === 'oni' ? 1 : .65); });
  for (let i = 0; i < world.fireLights.length; i++) world.fireLights[i].intensity = 16 + Math.sin(t * 8 + i * 1.7) * .65;
  const p = world.rain.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 2) { let y = p.getY(i) - dt * 7; if (y < -.3) y += 16; p.setY(i, y); p.setY(i + 1, y + .42); } p.needsUpdate = true;
}
