import * as THREE from './vendor/three.module.js';
import { JOURNEY, STATIONS, ZONES, STAGES, PICKUPS, bounds } from './journey3d.js';
import { agedTexture } from './environment3d.js';

// The road up Borrowed-Name Mountain as a place. Everything here is read from journey3d.js: the ground follows
// bounds(z), whatever stands at the roadside stands outside it, and each region has its own surface, edges,
// landmarks and air. Built once (behind the loading screen) into one group per region, drawn as instanced
// batches, and hidden region by region once the fog has swallowed them.
const TAU = Math.PI * 2, HALF = Math.PI / 2, CLEAR = .6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return mix(mix(hash(ix, iz), hash(ix + 1, iz), u), mix(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v); }
function zoneIndex(z) { for (let i = 0; i < ZONES.length; i++) if (z > ZONES[i].to) return i; return ZONES.length - 1; }
// Two neighbouring regions and how far the second has taken over, within `width` metres of their border.
const blend = { a: 0, b: 0, t: 0 };
function zoneMix(z, width) {
  const i = zoneIndex(z), zone = ZONES[i]; blend.a = blend.b = i; blend.t = 0;
  if (i > 0 && zone.from - z < width) { blend.a = i - 1; blend.t = smooth(0, 1, .5 + (zone.from - z) / (2 * width)); }
  else if (i < ZONES.length - 1 && z - zone.to < width) { blend.b = i + 1; blend.t = smooth(0, 1, .5 - (z - zone.to) / (2 * width)); }
  return blend;
}
const zoned = (values, z, width) => { const m = zoneMix(z, width); return mix(values[m.a], values[m.b], m.t); };

// How far the paving runs past the walkable edge, how the land rises beyond it (heights at REACH metres out),
// what the bare earth is tinted, and how much of the moon gets through, region by region (south to north).
const APRON = [1.2, 1.2, 1.2, 1.2, 2.1, 4.4, 1.9, 1.2];
const REACH = [0, 2.5, 7, 14, 26, 45, 75, 120], COLUMNS = [0, 1.2, 2.5, 4.5, 7, 10, 14, 19, 26, 35, 45, 58, 75, 95, 120];
const RISE = [[0, 0, .1, .3, 1, 3, 7, 12], [0, .15, .5, 1.2, 3, 6, 10, 15], [0, .1, .6, 1.8, 4.5, 9, 15, 22], [0, .1, .5, 1.5, 3, 5, 8, 10], [0, .9, 1.7, 3, 6.5, 12, 19, 27], [0, 0, 0, .3, 2, 6, 12, 18], [0, 0, 0, 0, .5, 3, 8, 14], [0, 0, -.9, -1.1, -1.1, -1.1, -1.1, -1.1]];
const EARTH = ['#a39a8c', '#84907c', '#959a99', '#8d98a6', '#9c8f82', '#8e9496', '#8a8f90', '#8a8f90'];
const SUN = [1, .8, 1, 1, .85, 1, .04, 1];
const apron = z => zoned(APRON, z, 2);
const edge = (side, z) => side < 0 ? bounds(z).min : bounds(z).max;
// Height of the land at a point: level on the road and its apron, the region's slope (and some weather) beyond.
function ground(x, z) {
  const b = bounds(z), a = apron(z), d = x < b.min - a ? b.min - a - x : x > b.max + a ? x - b.max - a : 0; if (!d) return 0;
  let k = 1; while (k < REACH.length - 1 && REACH[k] < d) k++;
  const u = clamp((d - REACH[k - 1]) / (REACH[k] - REACH[k - 1]), 0, 1), m = zoneMix(z, z < 19 ? 1.5 : 5);
  const h = mix(mix(RISE[m.a][k - 1], RISE[m.a][k], u), mix(RISE[m.b][k - 1], RISE[m.b][k], u), m.t);
  return h * (.7 + .6 * noise(x * .07 + 40, z * .07)) + (noise(x * .23, z * .23 + 9) - .5) * Math.min(1.4, d * .12) * (h < 0 ? 0 : 1);
}
// Distance from a point to the walkable road (0 inside it).
function gap(x, z, reach = 1.6) { let best = reach; for (let k = -8; k <= 8; k++) { const dz = k * reach / 8, zz = z + dz; if (zz > JOURNEY.south || zz < JOURNEY.north) continue; const b = bounds(zz), dx = Math.max(0, b.min - x, x - b.max); best = Math.min(best, Math.hypot(dx, dz)); } return best; }
const clear = (x, z, radius = 0) => gap(x, z, CLEAR + radius + .05) >= CLEAR + radius;
// A point on the road's edge pushed `off` metres outward, with the outward normal and the yaw that faces the road.
function frame(side, z, off = 0, out = {}) {
  const e = .2, slope = (edge(side, z + e) - edge(side, z - e)) / (2 * e), len = Math.hypot(1, slope);
  out.nx = side / len; out.nz = -side * slope / len; out.x = edge(side, z) + out.nx * off; out.z = z + out.nz * off; out.yaw = Math.atan2(-out.nx, -out.nz); out.side = side; return out;
}
// Evenly spaced stops along one edge, south to north.
function walk(side, z0, z1, step, off, fn) { const f = {}; let acc = step, px = edge(side, z0), n = 0; for (let z = z0; z >= z1 - 1e-6; z -= .1) { const x = edge(side, z); acc += Math.hypot(x - px, .1); px = x; if (acc >= step) { acc -= step; fn(frame(side, z, off, f), n++); } } }

// ---------- painted textures (all drawn inside the constructor: this module must import without a DOM)
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(c, { color = true, repeat = false } = {}) { const t = new THREE.CanvasTexture(c); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
// A soft blot that wraps round the edges, so stains never show the tile seam.
function blot(g, size, x, y, radius, inner, outer) { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { const px = x + ox, py = y + oy; if (px + radius < 0 || px - radius > size || py + radius < 0 || py - radius > size) continue; const gr = g.createRadialGradient(px, py, 0, px, py, radius); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(px - radius, py - radius, radius * 2, radius * 2); } }
function grain(g, size, amount, r) { const px = g.getImageData(0, 0, size, size); for (let i = 0; i < px.data.length; i += 4) { const n = (r() - .5) * amount; px.data[i] += n; px.data[i + 1] += n; px.data[i + 2] += n; } g.putImageData(px, 0, 0); }
function mudTextures() {
  const S = 1024, r = random(311), c = canvas(S), rough = canvas(S), g = c.getContext('2d'), rg = rough.getContext('2d');
  g.fillStyle = '#3b3832'; g.fillRect(0, 0, S, S); rg.fillStyle = '#c2c2c2'; rg.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) blot(g, S, r() * S, r() * S, 10 + r() * 70, i % 3 ? '#1b191538' : '#6f66562c', '#00000000');
  for (let i = 0; i < 2600; i++) { const v = 40 + r() * 50; g.fillStyle = `rgba(${v + 6},${v + 4},${v},.55)`; g.beginPath(); g.ellipse(r() * S, r() * S, 1 + r() * 3.5, 1 + r() * 2.5, r() * 3, 0, TAU); g.fill(); }
  // Cart ruts and footfalls run along the road; rain stands in them.
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, len = 40 + r() * 160, bend = (r() - .5) * 30, end = (r() - .5) * 16; g.strokeStyle = '#17151366'; g.lineWidth = 2 + r() * 5; for (const ox of [-S, 0, S]) for (const oy of [-S, 0]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + bend, y + oy + len / 2, x + ox + end, y + oy + len); g.stroke(); } }
  grain(g, S, 20, r);
  // Standing water is flat: it goes into colour and gloss after the relief has been taken.
  const b = canvas(S); b.getContext('2d').drawImage(c, 0, 0);
  for (let i = 0; i < 16; i++) { const x = r() * S, y = r() * S, radius = 34 + r() * 100; blot(g, S, x, y, radius, '#0d151bb8', '#0d151b00'); blot(rg, S, x, y, radius * .9, '#6e6e6eff', '#6e6e6e00'); blot(b.getContext('2d'), S, x, y, radius, '#30303090', '#30303000'); }
  return { map: texture(c, { repeat: true }), bumpMap: texture(b, { color: false, repeat: true }), roughnessMap: texture(rough, { color: false, repeat: true }) };
}
function flagTextures() {
  const S = 1024, w = 128, h = 64, r = random(533), c = canvas(S), b = canvas(S), rough = canvas(S), g = c.getContext('2d'), bg = b.getContext('2d'), rg = rough.getContext('2d');
  g.fillStyle = '#171e20'; g.fillRect(0, 0, S, S); bg.fillStyle = '#121212'; bg.fillRect(0, 0, S, S); rg.fillStyle = '#858585'; rg.fillRect(0, 0, S, S);
  for (let row = 0; row < 16; row++) for (let col = -1; col < 9; col++) {
    const t = random(9000 + row * 8 + ((col % 8) + 8) % 8), x = col * w + (row % 2) * w / 2, y = row * h, inset = 1.5 + t() * 1.5, path = new Path2D();
    path.moveTo(x + inset + t() * 7, y + inset); path.lineTo(x + w - inset, y + inset + t() * 5); path.lineTo(x + w - inset - t() * 5, y + h - inset); path.lineTo(x + inset, y + h - inset - t() * 6); path.closePath();
    const shade = 49 + Math.floor(t() * 20); g.fillStyle = `rgb(${shade - 5},${shade + 1},${shade + 5})`; g.fill(path); g.strokeStyle = '#8d979b28'; g.lineWidth = 1.5; g.stroke(path);
    bg.fillStyle = `rgb(${160 + Math.floor(t() * 40)},180,180)`; bg.fill(path); bg.lineWidth = 5; bg.strokeStyle = '#585858'; bg.stroke(path);
    const wet = 75 + Math.floor(t() * 110); rg.fillStyle = `rgb(${wet},${wet},${wet})`; rg.fill(path);
  }
  for (let i = 0; i < 520; i++) { const x = r() * S, y = r() * S, radius = 4 + r() * 60; blot(g, S, x, y, radius, i % 4 ? '#050f1640' : '#9ba9a52b', '#18232a00'); if (i % 7 === 0) blot(rg, S, x, y, radius, '#272727cc', '#77777700'); }
  for (let i = 0; i < 50; i++) blot(g, S, r() * S, r() * S, 12 + r() * 40, '#65704b25', '#334a3400');
  grain(g, S, 18, r);
  const o = { repeat: true }; return { map: texture(c, o), bumpMap: texture(b, { color: false, repeat: true }), roughnessMap: texture(rough, { color: false, repeat: true }) };
}
function slabTextures() {
  const S = 1024, n = 4, w = S / n, r = random(947), c = canvas(S), rough = canvas(S), g = c.getContext('2d'), rg = rough.getContext('2d');
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) { const v = 26 + r() * 16, warm = r() * 6; g.fillStyle = `rgb(${v + warm},${v + 1},${v + 4 - warm})`; g.fillRect(col * w, row * w, w, w); const k = 46 + r() * 50; rg.fillStyle = `rgb(${k},${k},${k})`; rg.fillRect(col * w, row * w, w, w); }
  for (let i = 0; i < 260; i++) blot(g, S, r() * S, r() * S, 20 + r() * 90, i % 3 ? '#00000030' : '#8f8a8214', '#00000000');
  for (let i = 0; i < 70; i++) { let x = r() * S, y = r() * S; g.strokeStyle = '#9aa3a11c'; g.lineWidth = .6 + r(); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 90; y += (r() - .5) * 90; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 40; i++) blot(rg, S, r() * S, r() * S, 30 + r() * 110, '#9a9a9a70', '#9a9a9a00');
  g.strokeStyle = '#05080acc'; g.lineWidth = 3; rg.strokeStyle = '#d0d0d0'; rg.lineWidth = 3;
  for (let i = 0; i <= n; i++) for (const ctx of [g, rg]) { ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w, S); ctx.moveTo(0, i * w); ctx.lineTo(S, i * w); ctx.stroke(); }
  grain(g, S, 9, r);
  const map = texture(c, { repeat: true }); return { map, bumpMap: map, roughnessMap: texture(rough, { color: false, repeat: true }) };
}
function tileTexture() {
  const S = 256, c = canvas(S), g = c.getContext('2d'), r = random(61);
  for (let i = 0; i < 8; i++) { const gr = g.createLinearGradient(i * 32, 0, i * 32 + 32, 0); gr.addColorStop(0, '#20282c'); gr.addColorStop(.5, '#a3adb1'); gr.addColorStop(1, '#20282c'); g.fillStyle = gr; g.fillRect(i * 32, 0, 32, S); }
  for (let j = 0; j < 8; j++) { const gr = g.createLinearGradient(0, j * 32, 0, j * 32 + 32); gr.addColorStop(0, '#0000008c'); gr.addColorStop(.25, '#00000000'); gr.addColorStop(1, '#ffffff14'); g.fillStyle = gr; g.fillRect(0, j * 32, S, 32); }
  for (let i = 0; i < 500; i++) { g.fillStyle = i % 2 ? '#0a12142a' : '#c6d0c81c'; g.fillRect(r() * S, r() * S, 2 + r() * 10, 2 + r() * 8); }
  return texture(c, { repeat: true });
}
function steleTexture() {
  const c = canvas(256, 512), g = c.getContext('2d'), r = random(77), names = '王李張劉陳楊黃趙吳周徐孫馬朱胡林郭何高羅鄭梁謝宋唐許韓馮鄧曹';
  g.fillStyle = '#5a605f'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 5200; i++) { g.fillStyle = i % 3 ? '#02090818' : '#d1c8b215'; g.fillRect(r() * 256, r() * 512, r() * 6, r() * 4); }
  for (let i = 0; i < 26; i++) { const x = r() * 256, y = r() * 512, radius = 20 + r() * 90, gr = g.createRadialGradient(x, y, 0, x, y, radius); gr.addColorStop(0, i % 3 ? '#00070a3d' : '#e3d6bf1f'); gr.addColorStop(1, '#00000000'); g.fillStyle = gr; g.fillRect(x - radius, y - radius, radius * 2, radius * 2); }
  // What was carved here …
  g.fillStyle = '#23292a'; g.font = '46px "Songti TC", serif'; g.textAlign = 'center'; for (let col = 0; col < 3; col++) for (let row = 0; row < 7; row++) g.fillText(names[Math.floor(r() * names.length)], 66 + col * 62, 122 + row * 52);
  // … and scraped off again.
  g.fillStyle = '#9aa09a'; g.globalAlpha = .74; g.fillRect(30, 62, 196, 392); g.globalAlpha = 1;
  for (let i = 0; i < 1100; i++) { g.strokeStyle = i % 2 ? '#b9beb650' : '#343a3944'; g.lineWidth = .6 + r() * 1.8; const x = 26 + r() * 204, y = 58 + r() * 400, a = -.95 + r() * .55, l = 8 + r() * 50; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = r() * 256, y = r() * 300, len = 60 + r() * 220, gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, '#02080b4a'); gr.addColorStop(1, '#02080b00'); g.fillStyle = gr; g.fillRect(x, y, 1.5 + r() * 5, len); }
  return texture(c);
}
function plaqueTexture(text, aspect = .4) {
  const W = 512, H = Math.round(W * aspect), c = canvas(W, H), g = c.getContext('2d'); g.fillStyle = '#172021'; g.fillRect(0, 0, W, H); g.strokeStyle = '#a38b57'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
  if (text) { let size = H * .46; g.font = `${size}px "Songti TC", serif`; const wide = g.measureText(text).width; if (wide > W - 90) size *= (W - 90) / wide; g.font = `${size}px "Songti TC", serif`; g.fillStyle = '#c9af77'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + size * .05); }
  else { const r = random(5); g.fillStyle = '#7d8580'; g.globalAlpha = .5; g.fillRect(54, 44, W - 108, H - 88); g.globalAlpha = 1; for (let i = 0; i < 260; i++) { g.strokeStyle = i % 2 ? '#aab0a960' : '#11191a70'; g.lineWidth = 1 + r() * 2; const x = 50 + r() * (W - 100), y = 40 + r() * (H - 80), l = 10 + r() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - l * (.2 + r() * .5)); g.stroke(); } }
  return texture(c);
}
function charmTexture() {
  const c = canvas(64, 192), g = c.getContext('2d'), r = random(19); g.fillStyle = '#b79f58'; g.fillRect(0, 0, 64, 192);
  for (let i = 0; i < 300; i++) { g.fillStyle = i % 2 ? '#3a2a1022' : '#f2e2a018'; g.fillRect(r() * 64, r() * 192, 1 + r() * 5, 1 + r() * 3); }
  g.strokeStyle = '#7d2217'; g.lineWidth = 2; g.strokeRect(5, 5, 54, 182); g.fillStyle = '#7d2217'; g.font = '24px "Songti TC", serif'; g.textAlign = 'center'; g.fillText('敕', 32, 34); g.fillText('令', 32, 60);
  g.lineWidth = 2.4; g.beginPath(); let y = 74; g.moveTo(32, y); for (let i = 0; i < 9; i++) { y += 7; g.quadraticCurveTo(32 + (i % 2 ? 20 : -20), y - 3.5, 32, y); } g.stroke();
  // Where the name went there is only a rubbed patch.
  g.fillStyle = '#c9b77c'; g.globalAlpha = .8; g.fillRect(14, 142, 36, 36); g.globalAlpha = 1; for (let i = 0; i < 26; i++) { g.strokeStyle = '#6b55303a'; g.lineWidth = 1; const x = 14 + r() * 36, yy = 142 + r() * 36; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 8, yy - 5); g.stroke(); }
  return texture(c);
}
function tabletTexture() {
  const c = canvas(256, 128), g = c.getContext('2d'), r = random(401), names = '王李張劉陳楊黃趙吳周徐孫馬朱胡林郭何高羅阿禾柳山晚青田滿穗';
  for (let k = 0; k < 4; k++) {
    const x = k * 64, v = 74 + r() * 30; g.fillStyle = `rgb(${v + 30},${v},${v - 22})`; g.fillRect(x, 0, 64, 128);
    for (let i = 0; i < 60; i++) { g.fillStyle = i % 2 ? '#1a0f0826' : '#f0d8b014'; g.fillRect(x + r() * 62, r() * 128, 1 + r() * 1.6, 8 + r() * 60); }
    g.fillStyle = '#120c09'; g.beginPath(); g.arc(x + 32, 12, 4, 0, TAU); g.fill(); g.fillStyle = '#7a2a1e'; g.fillRect(x + 30, 0, 4, 10);
    g.fillStyle = '#17100dd8'; g.font = '30px "Songti TC", serif'; g.textAlign = 'center'; for (let row = 0; row < 3; row++) g.fillText(names[Math.floor(r() * names.length)], x + 32, 50 + row * 32);
    g.strokeStyle = '#1a0f0888'; g.lineWidth = 2; g.strokeRect(x + 2, 2, 60, 124);
  }
  return texture(c);
}
function leafTexture() {
  const S = 256, c = canvas(S), g = c.getContext('2d'), r = random(88);
  g.strokeStyle = '#3b4a39'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 128); g.quadraticCurveTo(110, 118, 236, 136); g.stroke();
  for (let i = 0; i < 26; i++) {
    const t = r(), x0 = 6 + t * 190, y0 = 128 + (r() - .5) * 26, a = (r() - .5) * 1.5, len = 62 + r() * 62, wide = 7 + r() * 6, x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -Math.sin(a) * wide, ny = Math.cos(a) * wide;
    const v = 52 + r() * 46; g.fillStyle = `rgb(${v * .62},${v},${v * .64})`; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx, my + ny, x1, y1); g.quadraticCurveTo(mx - nx, my - ny, x0, y0); g.fill();
    g.strokeStyle = '#0c16105a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  return texture(c);
}
function bambooTexture() {
  const c = canvas(32, 256), g = c.getContext('2d'), r = random(42), gr = g.createLinearGradient(0, 0, 32, 0); gr.addColorStop(0, '#3a4d3a'); gr.addColorStop(.45, '#7d9a78'); gr.addColorStop(1, '#2f3f31'); g.fillStyle = gr; g.fillRect(0, 0, 32, 256);
  for (let y = 0; y < 256; y += 64) { g.fillStyle = '#141d16'; g.fillRect(0, y + 28, 32, 3); g.fillStyle = '#a9c09d88'; g.fillRect(0, y + 31, 32, 2); g.fillStyle = '#1a261c55'; g.fillRect(0, y + 33, 32, 9); }
  for (let i = 0; i < 90; i++) { g.fillStyle = i % 2 ? '#0d150f2e' : '#cfe0c018'; g.fillRect(r() * 32, r() * 256, 1 + r() * 2, 6 + r() * 30); }
  const t = texture(c, { repeat: true }); t.repeat.set(1, 6); return t;
}
function bannerTexture() {
  const c = canvas(128, 512), g = c.getContext('2d'); g.fillStyle = '#642e23'; g.fillRect(0, 0, 128, 512); g.strokeStyle = '#b89c5d'; g.lineWidth = 3; g.strokeRect(12, 12, 104, 470); g.fillStyle = '#c5ad71'; g.font = '50px "Songti TC", serif'; g.textAlign = 'center'; ['敕', '令', '鎮', '祟'].forEach((v, i) => g.fillText(v, 64, 100 + i * 104));
  return texture(c);
}
function barrierTexture() {
  const S = 256, c = canvas(S), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const fade = g.createLinearGradient(0, 0, 0, S); fade.addColorStop(0, '#ff3a2a00'); fade.addColorStop(.12, '#ff3a2a30'); fade.addColorStop(.55, '#ff3a2a16'); fade.addColorStop(1, '#ff3a2a5a'); g.fillStyle = fade; g.fillRect(0, 0, S, S);
  g.fillStyle = '#ff5a40'; g.font = '44px "Songti TC", serif'; g.textAlign = 'center'; g.globalAlpha = .75; for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) g.fillText('封禁鎮名'[(row + col) % 4], 32 + col * 64, 52 + row * 62);
  g.globalAlpha = .5; g.fillStyle = '#ff7b5c'; for (let col = 0; col <= 4; col++) g.fillRect(col * 64 - 1, 0, 2, S); g.globalAlpha = 1; g.fillStyle = '#ff8a66'; g.fillRect(0, 0, S, 5); g.fillRect(0, S - 6, S, 6);
  const t = texture(c, { repeat: true }); t.repeat.set(2, 1); return t;
}
function mistTexture() {
  const S = 256, c = canvas(S), g = c.getContext('2d'), r = random(73); g.clearRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) blot(g, S, r() * S, r() * S, 26 + r() * 70, `rgba(255,255,255,${.1 + r() * .22})`, 'rgba(255,255,255,0)');
  return texture(c, { color: false, repeat: true });
}
function rubbingTexture(name) {
  const c = canvas(96, 192), g = c.getContext('2d'), r = random(name.charCodeAt(0)); g.fillStyle = '#d6caa6'; g.fillRect(0, 0, 96, 192); g.fillStyle = '#16171a'; g.fillRect(9, 9, 78, 174);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(214,202,166,${r() * .16})`; g.fillRect(9 + r() * 78, 9 + r() * 174, 1 + r() * 3, 1 + r() * 2); }
  g.fillStyle = '#efe6c8'; g.textAlign = 'center'; const size = Math.min(46, 150 / name.length); g.font = `${size}px "Songti TC", serif`; [...name].forEach((ch, i) => g.fillText(ch, 48, 96 - (name.length - 1) * size * .55 + i * size * 1.1 + size * .36));
  return texture(c);
}
function runnerTexture() {
  const c = canvas(128, 512), g = c.getContext('2d'), r = random(205); g.fillStyle = '#4a1d1a'; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 1800; i++) { g.fillStyle = i % 2 ? '#1a070628' : '#a0503a16'; g.fillRect(r() * 128, r() * 512, 1 + r() * 2, 2 + r() * 14); }
  g.strokeStyle = '#9c8046'; g.lineWidth = 3; g.strokeRect(9, -4, 110, 520); g.lineWidth = 1; g.strokeRect(15, -4, 98, 520);
  g.strokeStyle = '#9c804670'; for (let y = 0; y < 512; y += 64) { g.beginPath(); g.moveTo(64, y + 8); g.lineTo(92, y + 32); g.lineTo(64, y + 56); g.lineTo(36, y + 32); g.closePath(); g.stroke(); }
  for (let i = 0; i < 30; i++) blot(g, 512, r() * 128, r() * 512, 10 + r() * 40, '#0a040466', '#0a040400');
  const t = texture(c, { repeat: true }); t.repeat.set(1, 6); return t;
}
function sealTexture() {
  const S = 512, c = canvas(S), g = c.getContext('2d'); g.clearRect(0, 0, S, S); g.strokeStyle = '#c9b88a'; g.lineWidth = 4;
  for (const radius of [150, 162, 236, 244]) { g.beginPath(); g.arc(256, 256, radius, 0, TAU); g.stroke(); }
  g.fillStyle = '#c9b88a'; for (let i = 0; i < 8; i++) { g.save(); g.translate(256, 256); g.rotate(i * TAU / 8); for (let j = 0; j < 3; j++) { const y = 176 + j * 17; if ((i >> j) & 1) g.fillRect(-34, y, 68, 7); else { g.fillRect(-34, y, 27, 7); g.fillRect(7, y, 27, 7); } } g.restore(); }
  g.font = '120px "Songti TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = .7; g.fillText('名', 256, 262);
  return texture(c);
}
function beamTexture() { const c = canvas(64, 128), g = c.getContext('2d'), px = g.createImageData(64, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) { const u = (x - 31.5) / 32, v = 1 - y / 127, a = Math.exp(-u * u * 9) * Math.pow(1 - v, 1.6) * Math.min(1, v * 14) * 255, i = (y * 64 + x) * 4; px.data[i] = px.data[i + 1] = px.data[i + 2] = a; px.data[i + 3] = 255; } g.putImageData(px, 0, 0); return texture(c, { color: false }); }

// ---------- shared shapes
// A curved hip roof in a unit box (eaves at y 0 on a 2 x 2 footprint, ridge at y 1); `ridge` 1 makes it a gable.
function roofGeometry(ridge) {
  const pos = [], uv = [], idx = [], corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]], rows = 6;
  for (let face = 0; face < 4; face++) {
    const a = corners[face], b = corners[(face + 1) % 4], long = face % 2 === 0, cols = long ? 12 : 6, o = pos.length / 3;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const u = i / cols, v = j / rows, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u; pos.push(x * (ridge + (1 - ridge) * v), Math.pow(1 - v, 1.6) + .11 * Math.pow(Math.abs(x * z), 6) * v * v, z * (.03 + .97 * v)); uv.push(u * (long ? 3 : 1.5), v * 1.25); }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = o + j * (cols + 1) + i; idx.push(k, k + cols + 1, k + 1, k + 1, k + cols + 1, k + cols + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Three drooping blades of leaves fanning from a stalk.
function sprayGeometry() {
  const pos = [], uv = [], idx = [];
  [[-.7, .12], [.05, -.06], [.75, .2]].forEach(([angle, lift], k) => { const c = Math.cos(angle), s = Math.sin(angle); [0, .5, 1].forEach(t => { const y = -.36 * t * t + lift * t; for (const side of [-1, 1]) { pos.push(c * t - s * side * .3, y + side * .05, s * t + c * side * .3); uv.push(t, side * .5 + .5); } }); const o = k * 6; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2, o + 2, o + 3, o + 4, o + 3, o + 5, o + 4); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function peakGeometry() {
  const g = new THREE.CylinderGeometry(.03, 1, 1, 12, 6), a = g.attributes.position;
  for (let i = 0; i < a.count; i++) { const v = clamp(a.getY(i) + .5, 0, 1), old = Math.hypot(a.getX(i), a.getZ(i)); if (old < .001) { a.setY(i, v); continue; } const angle = Math.atan2(a.getZ(i), a.getX(i)), radius = Math.pow(1 - v, .52) * (1 + .15 * Math.sin(v * 16 + angle * 3) + .1 * Math.sin(angle * 5)); a.setXYZ(i, Math.cos(angle) * radius + Math.sin(v * 3) * .2, v + Math.sin(angle * 4 + v * 7) * .05 * Math.sin(v * Math.PI), Math.sin(angle) * radius); }
  g.computeVertexNormals(); return g;
}
function rockGeometry() { const g = new THREE.IcosahedronGeometry(1, 1), a = g.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i), z = a.getZ(i), k = .78 + .44 * hash(Math.round(x * 50) + Math.round(y * 50) * 3.1, Math.round(z * 50)); a.setXYZ(i, x * k, y * k, z * k); } g.computeVertexNormals(); return g; }
// A hanging name tablet: two faces showing one of the four tablets painted in the atlas.
function tabletGeometry(k) { const g = new THREE.BufferGeometry(), w = .065, h = .15, d = .007, u0 = k / 4, u1 = (k + 1) / 4; g.setAttribute('position', new THREE.Float32BufferAttribute([-w, -h, d, w, -h, d, w, h, d, -w, h, d, w, -h, -d, -w, -h, -d, -w, h, -d, w, h, -d], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1, u0, 0, u1, 0, u1, 1, u0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); return g; }
function chevronGeometry() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, .2, 0, 0, -.3, .5, 0, .2, -.5, 0, .44, 0, 0, -.06, .5, 0, .44], 3)); g.setIndex([0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5]); return g; }
// Instance-level motion (leaves ride the wind, hung tablets turn on their strings) and a dithered window:
// whatever comes within arm's reach of the lens, or stands in front of the hero, is not drawn there.
// A floor under a roof: the sun's shadow map only reaches a few metres round the hero, so beyond it the moon would light the hall as if it had no roof.
function roofed(material) {
  const chunk = THREE.ShaderChunk.lights_fragment_begin, find = 'getDirectionalLightInfo( directionalLight, directLight );';
  if (chunk?.includes(find)) { material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', chunk.replace(find, find + ' directLight.color *= .06;')); }; material.customProgramCacheKey = () => 'roofed'; }
  return material;
}
function tune(material, time, focus, { body = '', near = 1.1 } = {}) {
  material.onBeforeCompile = shader => {
    shader.uniforms.swayTime = time; shader.uniforms.focusView = focus;
    if (body) shader.vertexShader = 'uniform float swayTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat swayPhase=instanceMatrix[3].x*.73+instanceMatrix[3].z*.91+instanceMatrix[3].y*.37;\n${body}\n#endif`);
    shader.fragmentShader = 'uniform vec3 focusView;\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n{float grit=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));float ahead=vViewPosition.z;if(dot(vViewPosition,vViewPosition)<${(near * near).toFixed(3)}*(.5+grit))discard;if(ahead<-focusView.z-1.3){vec2 off=(-vViewPosition.xy*(-focusView.z/max(ahead,.05))-focusView.xy)*vec2(1.,.7);if(length(off)<.9+.75*grit)discard;}}`);
  };
  material.customProgramCacheKey = () => `journey|${body}|${near}`; return material;
}

// ---------- the build
function construct(world, root) {
  const mobile = !!world.mobile, few = mobile ? .5 : 1, rnd = random(20261), time = { value: 0 }, haze = { value: .022 };
  const groups = ZONES.map(zone => { const g = new THREE.Group(); g.name = zone.id; root.add(g); return g; });
  const std = options => new THREE.MeshStandardMaterial(options), basic = options => new THREE.MeshBasicMaterial(options);
  const stoneMap = agedTexture('stone'), woodMap = agedTexture('wood'), mud = mudTextures(), flag = flagTextures(), slab = slabTextures(), tileMap = tileTexture(), mistMap = mistTexture();
  const wet = world.groundMaterial;
  const focus = { value: new THREE.Vector3(0, 0, -8) }, prop = (options, extra) => tune(std(options), time, focus, extra);
  // Most props share four materials and take their colour per instance, which keeps a region to a few dozen draws.
  const masonry = prop({ map: stoneMap, bumpMap: stoneMap, bumpScale: .055, roughness: .9 }), lumber = prop({ map: woodMap, bumpMap: woodMap, bumpScale: .04, roughness: .8 }), matte = prop({ roughness: 1 }), metal = prop({ roughness: .58, metalness: .74 });
  const of = (base, color, gain = 1) => ({ base, tint: new THREE.Color(color).multiplyScalar(gain) });
  const M = {
    stone: of(masonry, '#8b9596'), dark: of(masonry, '#525c5f'), moss: of(masonry, '#5d6e5a'), plaster: of(masonry, '#b3ae9f', 1.9), ochre: of(masonry, '#b06a55', 1.2), clay: of(masonry, '#8f6f5a'),
    timber: of(lumber, '#7d695d'), red: of(lumber, '#d98a72'), plank: of(lumber, '#8c7d70'), panel: of(lumber, '#7a5b52'),
    black: of(matte, '#101b1d'), bark: of(matte, '#182729'), peak: of(matte, '#273a40'), rope: of(matte, '#6d6048'), cloth: of(matte, '#5e2a22'), straw: of(matte, '#5d563e'), litter: of(matte, '#4c4e36'), paper: of(matte, '#8f8b78'),
    bronze: of(metal, '#7a6340'), iron: of(metal, '#7e8a92'),
    ceiling: std({ color: '#3a2f2c', map: woodMap, roughness: .95 }),
    tile: prop({ color: '#33464d', map: tileMap, bumpMap: tileMap, bumpScale: .09, roughness: .5, metalness: .15, side: THREE.DoubleSide }),
    glow: prop({ color: '#dca268', emissive: '#ff8327', emissiveIntensity: 3, roughness: .8 }),
    ember: prop({ color: '#e08a5a', emissive: '#ff4a1c', emissiveIntensity: 2.3, roughness: .8 }),
    window: prop({ color: '#8a6038', emissive: '#ff8a34', emissiveIntensity: .75, roughness: .9 }),
    stele: prop({ color: '#a7b0ae', map: steleTexture(), bumpMap: stoneMap, bumpScale: .04, roughness: .9 }),
    blank: prop({ map: plaqueTexture(''), roughness: .85 }),
    charm: prop({ map: charmTexture(), roughness: 1, side: THREE.DoubleSide }),
    banner: prop({ map: bannerTexture(), roughness: 1, side: THREE.DoubleSide }),
    bamboo: prop({ color: '#b3c6ac', map: bambooTexture(), roughness: .62 }, { near: 4.2 }),
    leaf: prop({ color: '#a9c2a4', map: leafTexture(), alphaTest: .42, side: THREE.DoubleSide, roughness: .8 }, { near: 4.2, body: 'transformed.y+=sin(swayTime*1.9+swayPhase+transformed.x*2.4)*.07*transformed.x;transformed.z+=cos(swayTime*1.4+swayPhase)*.05*transformed.x;' }),
    tablet: prop({ color: '#c9b8a6', map: tabletTexture(), roughness: .8, side: THREE.DoubleSide }, { near: 3.2, body: 'float swayTurn=sin(swayTime*.9+swayPhase*3.)*.42;transformed.xz=mat2(cos(swayTurn),-sin(swayTurn),sin(swayTurn),cos(swayTurn))*transformed.xz;' }),
    earth: std({ ...mud, bumpScale: .09, roughness: 1, vertexColors: true }),
    rock: std({ color: '#9aa4ab', map: stoneMap, bumpMap: stoneMap, bumpScale: .14, roughness: .96, vertexColors: true, side: THREE.DoubleSide })
  };
  M.lamp = M.glow;
  // A plain mesh cannot take an instance colour, so a tinted material is made real the first time one is needed.
  const reals = new Map(), real = mat => { if (!mat.tint) return mat; if (!reals.has(mat)) { const m = mat.base.clone(); m.color.copy(mat.tint); reals.set(mat, m); } return reals.get(mat); };
  const paved = (maps, color, extra) => { const m = wet.clone(); Object.assign(m, maps, extra); m.color.set(color); m.vertexColors = true; return m; };
  M.flag = paved(flag, '#b4bbbc', { bumpScale: .075, roughness: .95, clearcoat: .3 }); M.warm = paved(flag, '#b9aa9c', { bumpScale: .075, roughness: .95, clearcoat: .3 }); M.slab = roofed(paved(slab, '#b9bec2', { bumpScale: .06, roughnessMap: null, roughness: .82, clearcoat: .45, clearcoatRoughness: .3 }));
  // Indoors the polish has a dark hall to mirror, not the open sky the courtyard's stone reflects.
  if (world.scene.environment) { M.slab.envMap = world.scene.environment; M.slab.envMapIntensity = .07; }
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 8), pole: new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), taper: new THREE.CylinderGeometry(.5, 1, 1, 10),
    plane: new THREE.PlaneGeometry(1, 1), flat: new THREE.PlaneGeometry(1, 1).rotateX(-HALF), disc: new THREE.CircleGeometry(1, 9).rotateX(-HALF), ball: new THREE.SphereGeometry(1, 8, 5),
    rock: rockGeometry(), hip: roofGeometry(.48), gable: roofGeometry(1), spray: sprayGeometry(), peak: peakGeometry(), tablets: [0, 1, 2, 3].map(tabletGeometry),
    ring: new THREE.RingGeometry(1.42, 1.6, 64).rotateX(-HALF), mark: new THREE.RingGeometry(.4, .5, 40).rotateX(-HALF)
  };
  { const g = G.banner = new THREE.PlaneGeometry(.62, 2.8, 4, 10), a = g.attributes.position; for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(a.getY(i) * 4) * .05); g.computeVertexNormals(); }

  // ----- instanced batches, one per region / shape / material
  const batches = new Map(), dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), va = new THREE.Vector3(), vb = new THREE.Vector3(), vs = new THREE.Vector3(), quat = new THREE.Quaternion(); dummy.rotation.order = 'YXZ';
  let zone = 0, cast = false, shade = 1, tag = null;
  function push(geo, mat, matrix) { const c = mat.tint, base = c ? mat.base : mat, key = `${zone}:${geo.uuid}:${base.uuid}`; let b = batches.get(key); if (!b) batches.set(key, b = { zone, geo, mat: base, cast: false, matrices: [], colors: [], tinted: false }); b.matrices.push(matrix); if (cast) b.cast = true; if (c) b.colors.push(c.r * shade, c.g * shade, c.b * shade); else b.colors.push(shade, shade, shade); if (c || shade !== 1) b.tinted = true; if (tag) tag.refs.push({ batch: b, index: b.matrices.length - 1 }); }
  function emit(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) { dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); push(geo, mat, dummy.matrix.clone()); }
  function beam(geo, mat, ax, ay, az, bx, by, bz, radius, depth = radius) { vb.set(bx - ax, by - ay, bz - az); const length = vb.length(); quat.setFromUnitVectors(up, vb.normalize()); va.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); push(geo, mat, new THREE.Matrix4().compose(va, quat, vs.set(radius, length, depth))); }
  // Emit in the frame of something standing at (cx, cz) and turned by yaw.
  function at(cx, cy, cz, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw), L = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => emit(geo, mat, cx + x * c + z * s, cy + y, cz - x * s + z * c, sx, sy, sz, rx, ry + yaw, rz); L.x = (x, z) => cx + x * c + z * s; L.z = (x, z) => cz - x * s + z * c; return L; }
  function rope(mat, ax, ay, az, bx, by, bz, sag, parts, radius, each) { let px = ax, py = ay, pz = az; for (let i = 1; i <= parts; i++) { const t = i / parts, x = mix(ax, bx, t), y = mix(ay, by, t) - sag * 4 * t * (1 - t), z = mix(az, bz, t); beam(G.pole, mat, px, py, pz, x, y, z, radius); if (each && i < parts) each(x, y, z, i); px = x; py = y; pz = z; } }
  const add = (mesh, index = zone) => { groups[index].add(mesh); return mesh; };

  // ----- ribbons that follow the road's edge exactly (retaining walls, kerbs, the hall's walls)
  const sheets = new Map();
  function strip(mat, A, B, U, v0, v1, hint, shadow = false) {
    mat = real(mat); const key = `${zone}:${mat.uuid}:${shadow ? 1 : 0}`; let s = sheets.get(key); if (!s) sheets.set(key, s = { zone, mat, shadow, pos: [], uv: [], idx: [] });
    const o = s.pos.length / 3; for (let i = 0; i < A.length; i++) { s.pos.push(...A[i], ...B[i]); s.uv.push(U[i], v0, U[i], v1); }
    // Which way the ribbon faces is judged over its whole length: one segment, where the road's edge kinks, can point anywhere.
    let facing = 0; for (let i = 0; i < A.length - 1; i++) { const ex = A[i + 1][0] - A[i][0], ey = A[i + 1][1] - A[i][1], ez = A[i + 1][2] - A[i][2], fx = B[i][0] - A[i][0], fy = B[i][1] - A[i][1], fz = B[i][2] - A[i][2]; facing += (ey * fz - ez * fy) * hint[0] + (ez * fx - ex * fz) * hint[1] + (ex * fy - ey * fx) * hint[2]; }
    const flip = facing < 0;
    for (let i = 0; i < A.length - 1; i++) { const a = o + i * 2, b = a + 1, c = a + 2, d = a + 3; if (flip) s.idx.push(a, b, c, b, d, c); else s.idx.push(a, c, b, b, c, d); }
  }
  function wall(side, z0, z1, off, thick, y0, y1, mat, { inner = true, outer = true, top = true, shadow = false, scale = 3 } = {}) {
    const f = {}, I0 = [], I1 = [], O0 = [], O1 = [], U = [], n = Math.ceil((z0 - z1) / .5); let u = 0, px, pz, hx = 0, hz = 0;
    for (let i = 0; i <= n; i++) { frame(side, z0 - (z0 - z1) * i / n, off, f); if (i) u += Math.hypot(f.x - px, f.z - pz); px = f.x; pz = f.z; U.push(u / scale); hx -= f.nx; hz -= f.nz; I0.push([f.x, y0, f.z]); I1.push([f.x, y1, f.z]); const ox = f.x + f.nx * thick, oz = f.z + f.nz * thick; O0.push([ox, y0, oz]); O1.push([ox, y1, oz]); }
    if (inner) strip(mat, I0, I1, U, y0 / scale, y1 / scale, [hx, 0, hz], shadow);
    if (top) strip(mat, I1, O1, U, 0, thick / scale, [0, 1, 0], shadow);
    if (outer) strip(mat, O1, O0, U, y1 / scale, y0 / scale, [-hx, 0, -hz], shadow);
  }

  // ----- things the frame loop needs: glows, light anchors, see-through roofs, gates, pickups
  const halos = [], anchors = [], occluders = [], gates = [], reserved = [], mists = [];
  const halo = (x, y, z, size = 2.2, tint = WARM, index = zone) => halos.push([index, x, y, z, size, tint]);
  const WARM = [1, .42, .13], RED = [1, .26, .08], DIM = [.55, .24, .08];
  const anchor = (x, y, z, power = 15) => { const a = { x, y, z, power, on: 1 }; anchors.push(a); return a; };
  // Whatever would stand between the lens and the hero is taken away while it does.
  function occluder(z, test) { const o = { z, test, refs: [], meshes: [], parts: [], hidden: false, hold: 0 }; occluders.push(o); return o; }
  const free = (x, z, radius = 0) => reserved.every(c => Math.hypot(x - c.x, z - c.z) > c.r + radius);
  const doorways = STAGES.filter(s => !s.instant && !s.final).map(s => { const b = bounds(s.gate); return { z: s.gate, x: (b.min + b.max) / 2, half: (b.max - b.min) / 2 }; });
  const nearGate = (x, z) => doorways.some(d => Math.abs(z - d.z) < 1.5 && Math.abs(x - d.x) < d.half + 6.4);
  const pickups = PICKUPS.map(item => { const b = bounds(item.z), side = item.x - b.min < b.max - item.x ? -1 : 1, f = {}; let off = 1.05; do { frame(side, item.z, off, f); off += .1; } while (!clear(f.x, f.z, .38) && off < 3.5); reserved.push({ x: f.x, z: f.z, r: 1.15 }); return { item, x: f.x, z: f.z, yaw: Math.atan2(item.x - f.x, item.z - f.z), glow: 1, shown: -1 }; });

  // ----- props shared by more than one region
  function stoneLantern(x, z, { y = 0, s = 1, lit = true, light = false } = {}) {
    emit(G.box, M.stone, x, y + .15 * s, z, .78 * s, .3 * s, .78 * s); emit(G.cyl, M.stone, x, y + .75 * s, z, .16 * s, 1.1 * s, .16 * s); emit(G.box, M.bronze, x, y + 1.25 * s, z, .64 * s, .15 * s, .64 * s); emit(G.cyl, lit ? M.glow : M.dark, x, y + 1.55 * s, z, .22 * s, .46 * s, .22 * s);
    for (const dx of [-.28, .28]) for (const dz of [-.28, .28]) emit(G.box, M.bronze, x + dx * s, y + 1.55 * s, z + dz * s, .055 * s, .6 * s, .055 * s);
    emit(G.box, M.bronze, x, y + 1.88 * s, z, .8 * s, .12 * s, .8 * s); emit(G.cyl, M.bronze, x, y + 2 * s, z, .08 * s, .22 * s, .08 * s);
    if (lit) { halo(x, y + 1.6 * s, z, 2.3 * s); if (light) anchor(x, y + 1.7 * s, z, 15); }
  }
  function paperLantern(x, y, z, s = 1, light = false) { emit(G.ball, M.ember, x, y, z, .2 * s, .27 * s, .2 * s); emit(G.cyl, M.black, x, y + .27 * s, z, .1 * s, .05 * s, .1 * s); emit(G.cyl, M.black, x, y - .27 * s, z, .1 * s, .05 * s, .1 * s); halo(x, y, z, 1.7 * s, RED); if (light) anchor(x, y - .1, z, 13); }
  function bareTree(x, z, h, y = 0) { const lean = (rnd() - .5) * 1.2; beam(G.pole, M.bark, x, y - .7, z, x + lean, y + h, z, .13 + rnd() * .12); for (let j = 0; j < 5; j++) { const t = .4 + j * .1, by = y + h * t, bx = x + lean * t, dx = (j % 2 ? 1 : -1) * (1 + rnd() * 2), dz = (rnd() - .5) * 3; beam(G.pole, M.bark, bx, by, z, bx + dx, by + 1.5, z + dz, .055); beam(G.pole, M.bark, bx + dx, by + 1.5, z + dz, bx + dx * 1.4, by + 2.3, z + dz * 1.2, .023); } }
  function stele(x, z, h, yaw, { y = 0, fallen = false, lean = 0 } = {}) {
    const w = h * (.34 + rnd() * .1) + .25, d = .16 + h * .04; shade = .72 + rnd() * .4;
    if (fallen) { emit(G.box, M.dark, x, y + .14, z, w + .3, .28, d + .34, 0, yaw); emit(G.box, M.stele, x + Math.sin(yaw) * (h / 2 + .5), y + d / 2 + .04, z + Math.cos(yaw) * (h / 2 + .5), w, h, d, -HALF + (rnd() - .5) * .1, yaw + (rnd() - .5) * .5, 0); }
    else { emit(G.box, M.dark, x, y + .14, z, w + .3, .28, d + .34, 0, yaw); emit(G.box, M.stele, x, y + .26 + h / 2, z, w, h, d, lean, yaw, lean ? (rnd() - .5) * .08 : 0); if (h > 2.6 && !lean) emit(G.box, M.dark, x, y + .26 + h + .11, z, w + .18, .24, d + .16, 0, yaw); }
    shade = 1;
  }
  const rocks = (x, z, s, mat = M.dark, y = ground(x, z)) => { shade = .75 + rnd() * .4; emit(G.rock, mat, x, y + s * .25, z, s * (.8 + rnd() * .5), s * (.55 + rnd() * .4), s * (.8 + rnd() * .5), rnd(), rnd() * TAU, rnd()); shade = 1; };
  const boards = new Map(), board = (text, x, y, z, w, h, back, index = zone) => { const key = `${text}:${(h / w).toFixed(2)}`; if (!boards.has(key)) boards.set(key, std({ map: plaqueTexture(text, h / w), roughness: .85 })); const m = new THREE.Mesh(G.plane, boards.get(key)); m.position.set(x, y, z); m.scale.set(w, h, 1); if (back) m.rotation.y = Math.PI; return add(m, index); };

  // ----- gates: posts, lintels, roof and name board; the seal across the doorway and the ring are made per gate
  const barrierMap = barrierTexture();
  function seal(i, x, z, half) {
    const barrier = add(new THREE.Mesh(G.plane, basic({ map: barrierMap, color: '#ff5a3c', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); barrier.position.set(x, 2.4, z); barrier.scale.set(half * 2 + 1.1, 4.8, 1); barrier.renderOrder = 3;
    const ring = add(new THREE.Mesh(G.ring, basic({ color: '#ffcf7a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); ring.position.set(x, .06, z); ring.renderOrder = 2;
    gates.push({ index: i, x, z, barrier, ring, open: 0 });
  }
  function gate(i, post, panel) {
    const stage = STAGES[i], z = stage.gate, b = bounds(z), x = (b.min + b.max) / 2, half = (b.max - b.min) / 2, px = half + 1, H = 5.7;
    const top = occluder(z, (cx, cy, cz) => Math.abs(cz - z) < 1.7 && Math.abs(cx - x) < px + 2.6 && cy > 4.3 && cy < 9);
    cast = true;
    for (const s of [-1, 1]) {
      const ox = x + s * px; emit(G.box, M.stone, ox, .32, z, .78, .64, .78); emit(G.cyl, post, ox, .64 + H / 2, z, .3, H, .3); emit(G.cyl, M.bronze, ox, .72, z, .33, .12, .33);
      emit(G.box, M.stone, ox + s * 2.85, .45, z, 4.9, .9, .72); emit(G.box, panel, ox + s * 2.85, 1.95, z, 4.9, 2.1, .5); emit(G.gable, M.tile, ox + s * 2.85, 3, z, 2.6, .5, .64);
      for (const face of [1, -1]) { emit(G.box, M.timber, ox, 4, z + face * .42, .1, .1, .6); paperLantern(ox, 3.5, z + face * .68, 1.15); }
    }
    anchor(x, 3.7, z + .7, 16);
    tag = top; emit(G.box, post, x, 5.05, z, px * 2 + 1.5, .42, .46); emit(G.box, post, x, 6.22, z, px * 2 + 2.3, .36, .46); emit(G.box, M.black, x, 5.63, z, 4.3, 1.02, .4);
    for (const s of [-1, 1]) for (const dx of [2.9, 4.2]) emit(G.box, post, x + s * dx, 5.63, z, .2, .8, .36);
    emit(G.hip, M.tile, x, 6.4, z, px + 2.2, 1.35, 1.6); emit(G.box, M.stone, x, 7.8, z, px * .9, .16, .2);
    tag = null; cast = false;
    for (const face of [1, -1]) top.meshes.push(board(stage.gateName, x, 5.63, z + face * .215, 4, .98, face < 0));
    emit(G.box, M.stone, x, .012, z, half * 2 + 1.1, .05, 1.3); seal(i, x, z, half);
  }

  // ----- 無名村: a street of shuttered houses whose door plaques are blank
  function house(cx, cz, yaw, w, d, h, lit, detail) {
    const L = at(cx, 0, cz, yaw), c = Math.cos(yaw), s = Math.sin(yaw), tall = h + 3.2;
    tag = occluder(cz, (x, y, z) => { const dx = x - cx, dz = z - cz, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < w / 2 + .9 && Math.abs(lz) < d / 2 + .9 && y < tall; });
    cast = true; L(G.box, M.stone, 0, .2, 0, w + .3, .4, d + .3); shade = .8 + rnd() * .3; L(G.box, M.plaster, 0, .4 + h / 2, 0, w, h, d); shade = 1;
    L(G.hip, M.tile, 0, .4 + h, 0, w / 2 + .8, 1.5 + w * .08, d / 2 + .8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L(G.box, M.timber, sx * w / 2, .4 + h / 2, sz * d / 2, .22, h, .22);
    cast = false; L(G.box, M.timber, 0, .4 + h - .14, d / 2 + .02, w + .2, .26, .12); L(G.box, M.timber, 0, .4 + h * .52, d / 2 + .02, w + .1, .14, .1);
    if (detail) {
      const door = (rnd() - .5) * w * .28, wx = door + (door > 0 ? -1 : 1) * (w * .22 + .9), front = d / 2;
      L(G.box, M.black, door, 1.45, front + .03, 1.25, 2.1, .1); L(G.box, M.timber, door, 2.58, front + .07, 1.7, .16, .18); for (const sx of [-1, 1]) L(G.box, M.timber, door + sx * .72, 1.45, front + .07, .14, 2.1, .16);
      L(G.plane, M.blank, door, 2.9, front + .1, 1.1, .4, 1);
      for (let i = 0, n = 2 + Math.floor(rnd() * 3); i < n; i++) L(G.plane, M.charm, door + (rnd() - .5) * 1.05, 1.1 + rnd() * 1.1, front + .09, .15, .46, 1, 0, 0, (rnd() - .5) * .35);
      L(G.box, lit ? M.window : M.black, wx, 1.85, front + .03, 1.25, .95, .06); for (let i = -2; i <= 2; i++) L(G.box, M.timber, wx + i * .25, 1.85, front + .07, .05, 1, .05); for (const j of [-.26, .26]) L(G.box, M.timber, wx, 1.85 + j, front + .07, 1.3, .05, .05);
      if (lit) { halo(L.x(wx, front + .2), 1.85, L.z(wx, front + .2), 3, DIM); anchor(L.x(wx, front + 1.1), 2, L.z(wx, front + 1.1), 9); }
      if (rnd() < .7) { const bx = w / 2 - .5; L(G.cyl, M.timber, bx, .85, front + .55, .32, .9, .32); if (rnd() < .5) L(G.cyl, M.timber, bx - .7, .8, front + .5, .28, .8, .28); else L(G.box, M.timber, bx - .75, .7, front + .5, .6, .6, .6, 0, .3); }
    }
    tag = null;
  }
  function village() {
    zone = 0;
    // The way back is shut: a palisade and a barred gate close the street behind the hero.
    tag = occluder(342, (x, y, z) => z > 341 && z < 343 && Math.abs(x) < 19 && y < 6.5); cast = true;
    for (let x = -18; x <= 18; x += .42) { if (Math.abs(x) < 3.35) continue; const h = 3.1 + rnd() * .7; shade = .7 + rnd() * .4; emit(G.cyl, M.timber, x, h / 2 - .2, 342 + (rnd() - .5) * .12, .19, h, .19, (rnd() - .5) * .05, 0, (rnd() - .5) * .05); } shade = 1;
    for (const s of [-1, 1]) { emit(G.cyl, M.timber, s * 3.3, 2.3, 342, .28, 4.6, .28); emit(G.box, M.timber, s * 1.55, 1.9, 342, 3.05, 3.6, .16); for (const y of [.6, 1.9, 3.2]) emit(G.box, M.black, s * 1.55, y, 341.9, 3, .12, .06); for (let i = 0; i < 3; i++) emit(G.plane, M.charm, s * (.5 + i * .9), 1.5 + rnd(), 341.85, .16, .5, 1, 0, Math.PI, (rnd() - .5) * .4); }
    emit(G.box, M.timber, 0, 2, 341.8, 5.8, .22, .2); emit(G.box, M.timber, 0, 4.3, 342, 7.7, .32, .4); emit(G.hip, M.tile, 0, 4.45, 342, 4.7, 1.1, 1.3);
    tag = null; cast = false;
    for (const s of [-1, 1]) stoneLantern(s * 5.6, 341.25, { light: s < 0 });
    for (const [s, z, off, w, d, h, lit] of [[-1, 335, 3.4, 6.5, 5, 3, 0], [-1, 325.5, 4.2, 7.5, 5.4, 3.2, 1], [-1, 314, 3.6, 6, 4.6, 2.9, 0], [-1, 306, 5.6, 5.6, 4.4, 2.8, 0], [1, 336, 3.6, 6, 4.8, 3, 1], [1, 327.5, 6.2, 7, 5.2, 3.1, 0], [1, 316, 3.4, 7.4, 5, 3.2, 0], [1, 307.5, 4.6, 5.6, 4.4, 2.8, 1]]) { const f = frame(s, z, off + d / 2); house(f.x, f.z, f.yaw + (rnd() - .5) * .16, w, d, h, !!lit, true); }
    for (const [s, z, off] of [[-1, 338, 15], [-1, 329, 17], [-1, 318, 14], [-1, 309, 16], [1, 339, 16], [1, 330, 18], [1, 320, 15], [1, 310, 14], [-1, 322, 27], [1, 325, 28]]) { const f = frame(s, z, off); house(f.x, f.z, f.yaw + (rnd() - .5) * .7, 5 + rnd() * 2.5, 4.4 + rnd(), 2.7 + rnd() * .6, false, false); }
    // Low stone footing and a wattle fence keep the street to the street.
    for (const s of [-1, 1]) {
      wall(s, 340.9, 301, .72, .34, -.1, .46, M.stone);
      let px = null, pz = 0; walk(s, 340.8, 301.2, 1.35, .9, f => { const h = 1.05 + rnd() * .2, tilt = (rnd() - .5) * .12; shade = .75 + rnd() * .4; emit(G.cyl, M.timber, f.x, .46 + h / 2, f.z, .055, h, .055, tilt, 0, tilt); if (px !== null) for (const y of [.8, 1.25]) beam(G.pole, M.timber, px, y + (rnd() - .5) * .08, pz, f.x, y + (rnd() - .5) * .08, f.z, .035); px = f.x; pz = f.z; }); shade = 1;
    }
    // The well, with its bucket still on the rim.
    { const f = frame(1, 321.6, 3.3), L = at(f.x, 0, f.z, f.yaw); cast = true; L(G.cyl, M.stone, 0, .4, 0, 1, .8, 1); L(G.cyl, M.black, 0, .805, 0, .78, .02, .78); for (const s of [-1, 1]) L(G.box, M.timber, s * 1.08, 1.3, 0, .16, 2.6, .16); L(G.box, M.timber, 0, 2.5, 0, 2.5, .14, .14); L(G.gable, M.tile, 0, 2.58, 0, 1.6, .6, 1.05); cast = false; L(G.cyl, M.timber, 0, 2.2, 0, .09, 1.7, .09, 0, 0, HALF); L(G.box, M.rope, .15, 1.6, 0, .03, 1.2, .03); L(G.cyl, M.timber, .5, .98, .55, .2, .34, .2); }
    // Lines of paper charms strung over the street, every one with its name rubbed out.
    for (const z of [332.5, 322, 311]) { const a = frame(-1, z, 1.5, {}), b = frame(1, z - 1 + rnd() * 2, 1.5, {}); for (const p of [a, b]) emit(G.cyl, M.timber, p.x, 3.2, p.z, .07, 6.6, .07); rope(M.rope, a.x, 6.4, a.z, b.x, 6.4, b.z, .9, 22, .018, (x, y, zz) => emit(G.plane, M.charm, x, y - .27, zz, .15, .46, 1, 0, (rnd() - .5) * .9, (rnd() - .5) * .25)); }
    // Stepping stones down the middle of the street.
    for (let z = 339; z > 301; z -= 1.05 + rnd() * .3) { const b = bounds(z), x = (b.min + b.max) / 2 + Math.sin(z * .33) * 1.3 + (rnd() - .5) * .5; shade = .62 + rnd() * .3; emit(G.disc, M.stone, x, .014, z, .42 + rnd() * .3, 1, .32 + rnd() * .2, 0, rnd() * TAU); } shade = 1;
    for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1, f = frame(s, 303 + rnd() * 36, 9 + rnd() * 24); cast = i < 8; bareTree(f.x, f.z, 6 + rnd() * 6, ground(f.x, f.z)); } cast = false;
    for (let i = 0; i < 5; i++) { const f = frame(i % 2 ? 1 : -1, 304 + i * 7.5, 10 + rnd() * 6), y = ground(f.x, f.z); emit(G.taper, M.straw, f.x, y + .9, f.z, 1.3, 1.9, 1.3); }
    for (const [s, z] of [[-1, 319.5], [1, 331], [1, 312]]) { const f = frame(s, z, 1.7); if (free(f.x, f.z, .6)) stoneLantern(f.x, f.z, { light: true }); }
  }

  // ----- 雨竹林: tall stems close over the road and drip
  function bamboo() {
    zone = 1;
    function stalk(x, y, z, h, radius, lx, lz, sprays) {
      cast = true; shade = .68 + rnd() * .5; const tx = x + lx, tz = z + lz; beam(G.pole, M.bamboo, x, y - .3, z, tx, y + h, tz, radius);
      cast = !mobile; for (let j = 0; j < sprays; j++) { const t = .46 + rnd() * .54, s = 1.4 + rnd() * 1.6; shade = .6 + rnd() * .65; emit(G.spray, M.leaf, mix(x, tx, t), y + h * t, mix(z, tz, t), s, s, s, (rnd() - .5) * .5, rnd() * TAU, (rnd() - .5) * .4); }
      shade = 1; cast = false;
    }
    // The front rank is the wall: stems too close to pass, leaning in until their tops meet over the road.
    for (const s of [-1, 1]) walk(s, 299, 241, .46, 0, (f, n) => { const off = .9 + rnd() * 1.2, x = f.x + f.nx * off, z = f.z + f.nz * off; if (nearGate(x, z) || !free(x, z, .2) || !clear(x, z, .1)) return; const h = 8.5 + rnd() * 6, lean = Math.min(.5 + rnd() * 2.6, (off - .25) * h / 4.6); stalk(x, 0, z, h, .05 + rnd() * .04, -f.nx * lean + (rnd() - .5) * .8, -f.nz * lean + (rnd() - .5) * .8, n % 3 ? 3 : 4); });
    for (let i = 0, n = Math.round(760 * few); i < n; i++) { const z = 240.6 + rnd() * 59, s = rnd() < .5 ? -1 : 1, d = 2 + Math.pow(rnd(), 1.5) * 27, f = frame(s, z, d); if (nearGate(f.x, f.z) || !free(f.x, f.z, .3) || !clear(f.x, f.z, .6)) continue; const h = 9 + rnd() * 8, lean = d < 6 ? Math.min(1 + rnd() * 4.5, (d - .25) * h / 4.6) : rnd() * 1.5; stalk(f.x, ground(f.x, f.z), f.z, h, .055 + rnd() * .05, -f.nx * lean + (rnd() - .5) * 1.4, -f.nz * lean + (rnd() - .5) * 1.4, d > 16 ? 2 : 4); }
    for (let i = 0, n = Math.round(150 * few); i < n; i++) { const s = rnd() < .5 ? -1 : 1, f = frame(s, 238 + rnd() * 64, 28 + rnd() * 24); stalk(f.x, ground(f.x, f.z), f.z, 13 + rnd() * 9, .09 + rnd() * .05, (rnd() - .5) * 3, (rnd() - .5) * 3, 2); }
    for (let i = 0; i < 70; i++) { const s = rnd() < .5 ? -1 : 1, f = frame(s, 241 + rnd() * 58, 1 + rnd() * 2.6), size = .3 + rnd() * .65; if (nearGate(f.x, f.z) || !free(f.x, f.z, size) || !clear(f.x, f.z, size)) continue; rocks(f.x, f.z, size, M.moss); }
    // Fallen leaves plastered to the mud.
    for (let i = 0, n = Math.round(420 * few); i < n; i++) { const z = 241 + rnd() * 58, b = bounds(z); shade = .6 + rnd() * .7; emit(G.disc, M.litter, mix(b.min - 1, b.max + 1, rnd()), .013, z, .13 + rnd() * .07, 1, .035 + rnd() * .02, 0, rnd() * TAU); } shade = 1;
    for (const [s, z] of [[-1, 295], [1, 286.5], [-1, 277.5], [1, 262], [-1, 253], [1, 246]]) { const f = frame(s, z, 1.5); if (free(f.x, f.z, .6) && clear(f.x, f.z, .45)) stoneLantern(f.x, f.z, { light: true }); }
  }

  // ----- 千名碑林: every face scraped blank
  function steles() {
    zone = 2;
    for (const s of [-1, 1]) {
      wall(s, 239, 197, .68, .4, -.1, .32, M.dark);
      for (const [off, step, h0, h1] of [[1.55, 1.22, .9, 1.5], [3.1, 1.7, 1.6, 2.5], [5.2, 2.3, 2.4, 3.6], [8.4, 3.5, 3.8, 5.8]]) walk(s, 238.3, 197.7, step, off, f => { const x = f.x + (rnd() - .5) * .5, z = f.z + (rnd() - .5) * .5, roll = rnd(); if (nearGate(x, z) || !free(x, z, .7) || !clear(x, z, .55)) return; cast = off < 6; stele(x, z, mix(h0, h1, rnd()), f.yaw + (rnd() - .5) * .34, { y: ground(x, z), fallen: roll < .07 && off > 2, lean: roll > .7 ? (rnd() - .5) * .34 : 0 }); });
    }
    cast = false;
    for (let i = 0, n = Math.round(320 * few); i < n; i++) { const s = rnd() < .5 ? -1 : 1, f = frame(s, 195 + rnd() * 46, 10.5 + Math.pow(rnd(), 1.3) * 38); stele(f.x, f.z, 1.3 + rnd() * 3.2, f.yaw + (rnd() - .5) * .6, { y: ground(f.x, f.z) - .1, fallen: rnd() < .08, lean: rnd() < .3 ? (rnd() - .5) * .3 : 0 }); }
    // Two that can be seen from anywhere in the grove.
    for (const [s, z, off, h] of [[-1, 216, 13.5, 9.5], [1, 227, 12.5, 7.6], [1, 205, 15, 8.4]]) { const f = frame(s, z, off), y = ground(f.x, f.z); cast = true; emit(G.box, M.dark, f.x, y + .5, f.z, 3.6, 1.2, 2.2, 0, f.yaw); stele(f.x, f.z, h, f.yaw, { y: y + .9 }); cast = false; }
    // Slabs that fell across the clearing lie flush in the mud; torn rubbings blow between them.
    for (let i = 0; i < 12; i++) { const z = 200 + rnd() * 36, b = bounds(z), h = 1.6 + rnd() * 1.6; shade = .6 + rnd() * .3; emit(G.box, M.stele, mix(b.min + 1.5, b.max - 1.5, rnd()), .02, z, h * .42 + .2, h, .05, -HALF, rnd() * TAU); } shade = 1;
    for (let i = 0; i < 46; i++) { const z = 198 + rnd() * 40, b = bounds(z); shade = .16 + rnd() * .2; emit(G.flat, M.paper, mix(b.min, b.max, rnd()), .014, z, .16 + rnd() * .12, 1, .24 + rnd() * .2, 0, rnd() * TAU); } shade = 1;
    for (let z = 238; z > 198; z -= 1.5) { const b = bounds(z); shade = .55 + rnd() * .25; emit(G.flat, M.stone, (b.min + b.max) / 2 + Math.sin(z * .21) * 1.6 + (rnd() - .5) * .4, .012, z, 1.2 + rnd() * .5, 1, .8 + rnd() * .4, 0, (rnd() - .5) * .4); } shade = 1;
    for (let i = 0; i < 18; i++) { const f = frame(i % 2 ? 1 : -1, 197 + rnd() * 42, 4 + rnd() * 30); if (!free(f.x, f.z, 1)) continue; cast = i < 9; bareTree(f.x, f.z, 6 + rnd() * 7, ground(f.x, f.z)); } cast = false;
    for (const [s, z] of [[-1, 234], [1, 227], [-1, 217.5], [1, 208], [-1, 202]]) { const f = frame(s, z, 2.3); if (free(f.x, f.z, .6)) stoneLantern(f.x, f.z, { light: true }); }
  }

  // ----- 斷魂橋: a plank bridge over a drop that has no floor
  function cliff(row, z0, dir) {
    const pos = [], uv = [], col = [], idx = [], depth = [0, 1.6, 4.5, 9, 15, 23, 33, 45, 60], tops = [], D = depth.length;
    for (let i = 0; i < row.xs.length - 1; i++) { const n = Math.max(1, Math.ceil((row.xs[i + 1] - row.xs[i]) / 3)); for (let k = 0; k < n; k++) tops.push([mix(row.xs[i], row.xs[i + 1], k / n), mix(row.ys[i], row.ys[i + 1], k / n)]); } tops.push([row.xs.at(-1), row.ys.at(-1)]);
    for (const [x, y] of tops) depth.forEach((d, j) => { const n = noise(x * .11 + 7, j * 1.3 + (dir > 0 ? 30 : 0)), m = noise(x * .37, j * .9 + 3), out = j ? d * .15 + n * 4.5 + m * 1.2 - 1.9 : 0, c = mix(.95, .26, d / 60) * (.8 + n * .4); pos.push(x + (j ? (m - .5) * 1.6 : 0), y - d, z0 + dir * out); uv.push(x / 7, (y - d) / 7); col.push(c, c, c * 1.07); });
    for (let i = 0; i < tops.length - 1; i++) for (let j = 0; j < D - 1; j++) { const a = i * D + j, b = a + D; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); add(new THREE.Mesh(g, M.rock), 3).receiveShadow = true;
  }
  function ravine(rim) {
    zone = 3; const S = 187.5, N = 162.5, mid = (S + N) / 2;
    for (let z = S - .17; z > N; z -= .345) { shade = .68 + rnd() * .46; emit(G.box, M.plank, (rnd() - .5) * .12, -.06, z, 7.5 + (rnd() - .5) * .3, .12, .32, 0, (rnd() - .5) * .02, 0); } shade = 1;
    cast = false; for (const x of [-3.2, 0, 3.2]) emit(G.box, M.timber, x, -.36, mid, .34, .46, S - N + .4); for (let z = S; z >= N; z -= 2.5) emit(G.box, M.timber, 0, -.64, z, 8.8, .24, .3);
    // Towers at each end carry the cables; posts, two ropes and a string of paper charms make the rail.
    const towers = [];
    for (const [z, face] of [[S + .7, 1], [N - .7, -1]]) { let x = 4.2; while (!clear(x, z, .32) && x < 8) x += .1; towers.push(x); cast = true; for (const s of [-1, 1]) { emit(G.box, M.stone, s * x, .3, z, .8, .6, .8); emit(G.cyl, M.timber, s * x, 3.5, z, .28, 7.4, .28); paperLantern(s * x, 4.7, z + face * .55, 1.2); }
      tag = occluder(z, (cx, cy, cz) => Math.abs(cz - z) < 1.3 && Math.abs(cx) < x + 2 && cy > 5 && cy < 9); emit(G.box, M.timber, 0, 6.3, z, x * 2 + 1.8, .4, .4); emit(G.box, M.timber, 0, 5.5, z, x * 2 + .6, .3, .3); emit(G.gable, M.tile, 0, 6.55, z, x + 1.5, .7, .95); tag = null; cast = false; anchor(0, 4.6, z + face * .6, 15); }
    for (const s of [-1, 1]) {
      const x = s * 3.95; let i = 0;
      for (let z = S; z >= N - .01; z -= 2.5, i++) {
        cast = true; emit(G.box, M.timber, x, .45, z, .2, 1.7, .2); cast = false; emit(G.box, M.timber, x, 1.33, z, .28, .08, .28);
        if (z > N + .1) for (const y of [1.14, .62]) rope(M.rope, x, y, z, x, y, z - 2.5, .1, 3, .028, y > 1 ? (rx, ry, rz) => { for (const o of [-.35, .3]) if (rnd() < .7) emit(G.plane, M.charm, rx, ry - .24, rz + o, .12, .4, 1, 0, HALF + (rnd() - .5) * .7, (rnd() - .5) * .3); } : null);
        if (i % 3 === 1) { emit(G.ball, M.ember, x, 1.56, z, .15, .2, .15); halo(x, 1.56, z, 1.5, RED); if ((i + (s > 0 ? 3 : 0)) % 6 === 1) anchor(x, 1.7, z, 11); }
      }
      const tx = s * (towers[0] - .1); rope(M.rope, tx, 7, S + .7, tx, 7, N - .7, 4.9, 18, .06, (rx, ry, rz) => beam(G.pole, M.rope, rx, ry, rz, x, 1.3, rz, .016));
    }
    // The bridgeheads: rope fences where the ground narrows to the bridge, boulders on the rim, lanterns for the duel.
    for (const s of [-1, 1]) for (const [z0, z1] of [[195.2, 188.2], [161.8, 151.2]]) { let px = null, pz = 0; walk(s, z0, z1, 1.6, .85, f => { if (!free(f.x, f.z, .4)) { px = null; return; } shade = .75 + rnd() * .35; emit(G.cyl, M.timber, f.x, .6, f.z, .085, 1.3, .085, (rnd() - .5) * .1, 0, (rnd() - .5) * .1); shade = 1; if (px !== null) for (const y of [1.08, .6]) rope(M.rope, px, y, pz, f.x, y, f.z, .08, 2, .024); px = f.x; pz = f.z; }); }
    for (const [z, dir] of [[S, 1], [N, -1]]) for (let x = -64; x <= 64; x += 1.7 + rnd() * 1.6) { const size = .5 + rnd() * 1.1, zz = z + dir * (size * .7 + rnd() * 1.2); if (Math.abs(x) < 4.6 || !clear(x, zz, size) || !free(x, zz, size)) continue; rocks(x, zz, size); }
    for (let i = 0; i < 90; i++) { const north = rnd() < .5, s = rnd() < .5 ? -1 : 1, f = frame(s, north ? 151 + rnd() * 11 : 188 + rnd() * 7.5, 1.4 + rnd() * 9), size = .4 + rnd() * 1.3; if (nearGate(f.x, f.z) || !clear(f.x, f.z, size) || !free(f.x, f.z, size)) continue; cast = size > .9; rocks(f.x, f.z, size); } cast = false;
    // Blades planted where the bridge's keeper buried every challenger.
    for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1, f = frame(s, 152 + rnd() * 9, 1.5 + rnd() * 3.4); if (!clear(f.x, f.z, .3) || !free(f.x, f.z, .4)) continue; const L = at(f.x, ground(f.x, f.z), f.z, rnd() * TAU), tilt = (rnd() - .5) * .5; L(G.box, M.iron, 0, .52, 0, .05, 1.05, .012, tilt, 0, tilt * .6); L(G.box, M.bronze, tilt * .2, 1.03, 0, .22, .035, .05, tilt, 0, tilt * .6); L(G.box, M.black, tilt * .26, 1.16, 0, .036, .22, .036, tilt, 0, tilt * .6); }
    for (const [s, z] of [[-1, 159.8], [1, 159.8], [-1, 153.8], [1, 153.8], [-1, 193.4], [1, 193.4]]) { const f = frame(s, z, 1.35); if (free(f.x, f.z, .6) && clear(f.x, f.z, .45)) stoneLantern(f.x, f.z, { light: true }); }
    cliff(rim.south, S, -1); cliff(rim.north, N, 1);
    // Pinnacles stand out of the mist; the mist hides how far down the rest goes.
    for (let i = 0; i < 16; i++) { const x = (i % 2 ? 1 : -1) * (13 + rnd() * 70), z = N + 3 + rnd() * (S - N - 6), h = 40 + rnd() * 30, r = 2.6 + rnd() * 4; shade = .5 + rnd() * .35; emit(G.peak, M.dark, x, -60, z, r, h, r, 0, rnd() * TAU); } shade = 1;
    for (const [y, opacity, speed, tint] of [[-8, .3, .011, '#5d7892'], [-16, .5, -.007, '#4c6680'], [-26, .78, .004, '#3a5068']]) { const map = mistMap.clone(); map.needsUpdate = true; map.repeat.set(6, 1.2); const m = add(new THREE.Mesh(new THREE.PlaneGeometry(260, 50).rotateX(-HALF), basic({ map, color: tint, transparent: true, opacity, depthWrite: false })), 3); m.position.set(0, y, mid); m.renderOrder = 1; mists.push({ map, speed }); }
    add(new THREE.Mesh(new THREE.PlaneGeometry(270, 70).rotateX(-HALF), basic({ color: '#1a2836' })), 3).position.set(0, -46, mid);
  }

  // ----- 燃名香道: every lamp on this road is somebody's name burning
  function lanternRoad() {
    zone = 4;
    for (const s of [-1, 1]) {
      wall(s, 149, 105, 1.95, .62, -.2, 1.5, M.stone, { shadow: true });
      walk(s, 147.6, 106.2, 3.05, 1.22, (f, n) => {
        if (!free(f.x, f.z, .6) || !clear(f.x, f.z, .4)) return;
        if (n % 5 !== 2) { stoneLantern(f.x, f.z); const L = at(f.x, 0, f.z, f.yaw); for (let i = 0; i < 2; i++) { shade = .7 + rnd() * .4; L(G.tablets[(n + i) % 4], M.tablet, -.3 + i * .6 + (rnd() - .5) * .1, .52, .34, 1.7, 1.7, 1.7, -.2, (rnd() - .5) * .5); } shade = 1; return; }
        // An offering table: bowl, candles, and the tablets waiting their turn.
        const L = at(f.x, 0, f.z, f.yaw); cast = true; L(G.box, M.timber, 0, .82, 0, 1.7, .08, .6); cast = false; for (const sx of [-.76, .76]) for (const sz of [-.22, .22]) L(G.box, M.timber, sx, .4, sz, .08, .8, .08);
        L(G.box, M.cloth, 0, .55, .3, 1.5, .52, .02); L(G.cyl, M.bronze, 0, .95, .05, .16, .18, .16); for (let i = 0; i < 5; i++) { shade = .7 + rnd() * .4; L(G.tablets[i % 4], M.tablet, -.52 + i * .26, 1.06, -.19, 1.3, 1.3, 1.3, -.12, (rnd() - .5) * .3); } shade = 1;
        for (const sx of [-.58, .58]) { L(G.cyl, M.paper, sx, .98, .08, .028, .24, .028); L(G.ball, M.glow, sx, 1.14, .08, .03, .06, .03); halo(L.x(sx, .08), 1.16, L.z(sx, .08), .8); }
      });
    }
    // Lines of paper lanterns over the road, a name tablet hanging under each.
    for (let z = 146.2, k = 0; z > 107; z -= 4.9, k++) {
      const a = frame(-1, z, 3, {}), b = frame(1, z + (rnd() - .5) * 1.6, 3, {}), ya = ground(a.x, a.z), yb = ground(b.x, b.z); cast = true; emit(G.cyl, M.timber, a.x, ya + 3.6, a.z, .09, 7.6, .09); emit(G.cyl, M.timber, b.x, yb + 3.6, b.z, .09, 7.6, .09); cast = false;
      rope(M.rope, a.x, 7.3, a.z, b.x, 7.3, b.z, .9, 9, .02, (x, y, zz, i) => { paperLantern(x, y - .36, zz, .95); shade = .7 + rnd() * .4; emit(G.tablets[i % 4], M.tablet, x, y - .92, zz, 1.5, 1.5, 1.5, 0, rnd() * TAU); shade = 1; emit(G.box, M.rope, x, y - .7, zz, .012, .16, .012); if (i === 4 && k % 2 === 0) anchor(x, y - .6, zz, 17); });
    }
    // The hillsides: small votive lamps climbing out of sight.
    for (let i = 0, n = Math.round(520 * few); i < n; i++) { const s = rnd() < .5 ? -1 : 1, f = frame(s, 104.5 + rnd() * 45.5, 3 + Math.pow(rnd(), 1.25) * 36), y = ground(f.x, f.z); if (nearGate(f.x, f.z)) continue; emit(G.box, M.dark, f.x, y + .12, f.z, .17, .34, .17); emit(G.box, M.lamp, f.x, y + .36, f.z, .13, .15, .13); if (i % 4 === 0) halo(f.x, y + .38, f.z, .9); }
    for (let i = 0; i < 46; i++) { const f = frame(i % 2 ? 1 : -1, 105 + rnd() * 44, 3.4 + rnd() * 26); cast = false; if (i < 14) bareTree(f.x, f.z, 5 + rnd() * 5, ground(f.x, f.z)); else rocks(f.x, f.z, .5 + rnd() * 1.2); }
    // Ash and burnt paper on the flags.
    for (let i = 0, n = Math.round(150 * few); i < n; i++) { const z = 105 + rnd() * 44, b = bounds(z); shade = .2 + rnd() * .35; emit(G.flat, M.paper, mix(b.min - .5, b.max + .5, rnd()), .013, z, .16 + rnd() * .14, 1, .1 + rnd() * .1, 0, rnd() * TAU); } shade = 1;
  }

  // ----- 山門前庭: a walled court, galleries either side, plinths the guardians have left
  function plinth(L, y, w, h, feet) { cast = true; L(G.box, M.stone, 0, y + .25, 0, w + .5, .5, w + .5); L(G.box, M.dark, 0, y + .5 + h / 2, 0, w, h, w); L(G.box, M.stone, 0, y + .5 + h + .12, 0, w + .3, .24, w + .3); cast = false; if (feet) { for (const sx of [-.42, .42]) L(G.cyl, M.clay, sx * w / 2.2, y + .74 + h + .2, .1, .26, .42, .3, 0, 0, (rnd() - .5) * .2); for (let i = 0; i < 5; i++) L(G.rock, M.clay, (rnd() - .5) * w * .8, y + .78 + h, (rnd() - .5) * w * .8, .14 + rnd() * .14, .1, .16, rnd(), rnd() * TAU); } }
  function forecourt() {
    zone = 5;
    for (const s of [-1, 1]) {
      wall(s, 103, 70.6, 4.2, .5, 0, 4.3, M.ochre, { outer: false, shadow: true }); wall(s, 103, 70.6, 4.12, .1, 0, .8, M.stone, { outer: false });
      walk(s, 102.4, 71.2, 2.5, 4.45, f => emit(G.gable, M.tile, f.x, 4.3, f.z, 1.4, .4, .62, 0, f.yaw));
      // The gallery, broken in the middle by an alcove.
      const roofs = occluder(84, (x, y, z) => { if (z < 71 || z > 98 || y < 3.5 || y > 5.6) return false; const d = s * (x - edge(s, z)); return d > .2 && d < 4.6; });
      let px = null, pz = 0, pnx = 0, pnz = 0, bay = 0;
      walk(s, 96.6, 72.2, 4.05, 1.08, f => {
        if ((f.z < 88.2 && f.z > 79.8) || !free(f.x, f.z, .5)) { px = null; return; }
        cast = true; emit(G.box, M.stone, f.x, .25, f.z, .56, .5, .56, 0, f.yaw); emit(G.cyl, M.red, f.x, 2.2, f.z, .2, 3.4, .2); cast = false; emit(G.box, M.red, f.x, 3.86, f.z, .5, .16, 1.2, 0, f.yaw);
        if (px !== null) { const mx = (px + f.x) / 2, mz = (pz + f.z) / 2, nx = (pnx + f.nx) / 2, nz = (pnz + f.nz) / 2, len = Math.hypot(f.x - px, f.z - pz), yaw = Math.atan2(f.x - px, f.z - pz) - HALF; beam(G.box, M.red, px, 3.98, pz, f.x, 3.98, f.z, .16, .2); cast = true; tag = roofs; emit(G.gable, M.tile, mx + nx * 1.5, 4.05, mz + nz * 1.5, len / 2 + .2, .72, 1.95, 0, yaw); tag = null; cast = false; if (bay++ % 2 === 0) emit(G.banner, M.banner, mx - nx * .02, 2.5, mz - nz * .02, 1, 1, 1, 0, yaw + (s > 0 ? Math.PI : 0)); }
        px = f.x; pz = f.z; pnx = f.nx; pnz = f.nz;
      });
      for (const z of [94.5, 76]) { const f = frame(s, z, 1.3); if (free(f.x, f.z, .6)) stoneLantern(f.x, f.z, { light: true }); }
      // A terrace steps up to the mountain gate; the road is the stair between its balustrades.
      { const A0 = [], A1 = [], O1 = [], U = [], f = {}; for (let i = 0; i <= 16; i++) { frame(s, 70.6 - 7.2 * i / 16, .78, f); A0.push([f.x, 0, f.z]); A1.push([f.x, .9, f.z]); O1.push([s * 17.6, .9, f.z]); U.push(i * .16); }
        strip(M.stone, A0, A1, U, 0, .3, [-s, 0, 0], true); strip(M.stone, A1, O1, U, 0, 3, [0, 1, 0]); strip(M.stone, [[A0[0][0], 0, 70.6], [s * 17.6, 0, 70.6]], [[A0[0][0], .9, 70.6], [s * 17.6, .9, 70.6]], [0, 3], 0, .3, [0, 0, 1], true); }
      { let bx = null, bz = 0; walk(s, 70.3, 64.2, 1.45, 1.12, f => { cast = true; emit(G.box, M.stone, f.x, 1.4, f.z, .26, 1, .26, 0, f.yaw); cast = false; emit(G.ball, M.stone, f.x, 1.98, f.z, .16, .16, .16); if (bx !== null) { beam(G.box, M.stone, bx, 1.72, bz, f.x, 1.72, f.z, .1, .12); beam(G.box, M.stone, bx, 1.2, bz, f.x, 1.2, f.z, .09, .09); } bx = f.x; bz = f.z; }); }
      { const f = frame(s, 67.6, 3.9); plinth(at(f.x, 0, f.z, f.yaw), .9, 2.3, 1.2, true); const g = frame(s, 64.25, 2.3); plinth(at(g.x, 0, g.z, 0), .9, 1.3, .7, true); stoneLantern(s * 14.3, 69.3, { y: .9, light: true }); }
      { const f = frame(s, 100.7, 2.4); plinth(at(f.x, 0, f.z, f.yaw), 0, 1.5, 1.1, true); }
      // Bell and drum towers show over the walls.
      { const x = s * 24.5, z = 77, y = ground(x, z) - .5; emit(G.box, M.stone, x, y + 3, z, 5.4, 6, 5.4); emit(G.box, M.timber, x, y + 7.6, z, 4.4, 3.2, 4.4); emit(G.hip, M.tile, x, y + 9.2, z, 3.9, 1.9, 3.9); emit(G.box, M.window, x - s * 2.22, y + 7.6, z, .06, 1.2, 1.4); halo(x - s * 2.4, y + 7.6, z, 4, DIM); }
    }
    // East alcove: the great burner, still smouldering.
    { const f = frame(1, 84, 2.65), L = at(f.x, 0, f.z, f.yaw); cast = true; L(G.cyl, M.stone, 0, .2, 0, 1.55, .4, 1.55); L(G.cyl, M.stone, 0, .55, 0, 1.3, .3, 1.3); for (let i = 0; i < 3; i++) L(G.cyl, M.bronze, Math.sin(i * TAU / 3) * .75, 1.05, Math.cos(i * TAU / 3) * .75, .15, .75, .15); L(G.ball, M.bronze, 0, 1.85, 0, 1.2, .78, 1.2); L(G.cyl, M.bronze, 0, 2.42, 0, 1.24, .16, 1.24);
      cast = false; L(G.cyl, M.glow, 0, 2.51, 0, 1, .03, 1); for (const sx of [-1, 1]) { L(G.box, M.bronze, sx * 1.3, 2.2, 0, .12, .7, .4); L(G.cyl, M.bronze, sx * .82, 3.2, .82, .06, 1.5, .06); L(G.cyl, M.bronze, sx * .82, 3.2, -.82, .06, 1.5, .06); } L(G.hip, M.bronze, 0, 3.95, 0, 1.5, .8, 1.5); L(G.cyl, M.bronze, 0, 4.9, 0, .1, .5, .1);
      for (let i = 0; i < 5; i++) { const a = rnd() * TAU, d = rnd() * .6; L(G.cyl, M.paper, Math.sin(a) * d, 2.85, Math.cos(a) * d, .014, .7, .014, (rnd() - .5) * .3, 0, (rnd() - .5) * .3); } halo(f.x, 2.75, f.z, 5.5); anchor(f.x - f.nx * .4, 3, f.z - f.nz * .4, 22); }
    // West alcove: the bell nobody rings.
    { const f = frame(-1, 82.2, 2.7), L = at(f.x, 0, f.z, f.yaw); cast = true; for (const sx of [-1.15, 1.15]) L(G.box, M.timber, sx, 1.6, 0, .22, 3.2, .22); L(G.box, M.timber, 0, 3.1, 0, 2.9, .26, .26); L(G.gable, M.tile, 0, 3.25, 0, 1.8, .6, .9); L(G.taper, M.bronze, 0, 1.95, 0, .62, 1.35, .62); cast = false; L(G.cyl, M.bronze, 0, 2.75, 0, .09, .34, .09); L(G.cyl, M.timber, 1.5, 1.7, .5, .1, 1.6, .1, 0, 0, HALF); }
    { const m = add(new THREE.Mesh(G.flat, std({ map: sealTexture(), transparent: true, opacity: .34, depthWrite: false, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); m.position.set(0, .012, 84); m.scale.set(13, 1, 13); m.receiveShadow = true; }
  }

  // ----- 借名殿: the mountain gate, and behind it a hall hung with every name the mountain holds
  function facade(z, depth, face, front, behind, index) {
    // `face` +1 looks south (the mountain gate), -1 north (the door onto the temple court).
    const out = z + face * depth / 2, o = occluder(z, (x, y, zz) => Math.abs(zz - z) < depth / 2 + 1.4 && Math.abs(x) < 18.5 && (Math.abs(x) > 5.2 || y > 4.7) && y < 13);
    tag = o; cast = true;
    for (const s of [-1, 1]) {
      emit(G.box, M.stone, s * 11.6, -.1, z, 11.6, 2.2, depth + .3); emit(G.box, M.ochre, s * 11.6, 4.1, z, 11.4, 6.2, depth); emit(G.box, M.red, s * 5.62, 2.6, z, .8, 5.2, depth + .06);
      for (const x of [5.85, 10.7, 15.7]) { emit(G.box, M.stone, s * x, -.3, out + face * .4, .78, 2, .78); emit(G.cyl, M.red, s * x, 3.95, out + face * .4, .34, 6.7, .34); for (const y of [7, 7.25, 7.5]) emit(G.box, M.red, s * x, y, out + face * .4, .9 + (y - 7) * 1.6, .16, 1.2); }
      emit(G.box, M.window, s * 8.3, 3.7, out + face * .02, 2.7, 2.3, .06); for (let i = -5; i <= 5; i++) emit(G.box, M.timber, s * 8.3 + i * .25, 3.7, out + face * .06, .06, 2.4, .08); for (let j = -4; j <= 4; j++) emit(G.box, M.timber, s * 8.3, 3.7 + j * .27, out + face * .06, 2.8, .06, .08);
      halo(s * 8.3, 3.7, out + face * .4, 4.5, DIM, index);
    }
    emit(G.box, M.ochre, 0, 6.35, z, 11.9, 2.3, depth); emit(G.box, M.red, 0, 5, out + face * .1, 12.2, .5, .5); emit(G.box, M.red, 0, 7.62, z, 35.8, .36, depth + 1.6); emit(G.box, M.black, 0, 6.3, out + face * .06, 5.6, 1.8, .12);
    emit(G.hip, M.tile, 0, 7.8, z, 19.6, 2.9, depth / 2 + 3.1); emit(G.box, M.stone, 0, 10.75, z, 9.6, .2, .3);
    tag = null; cast = false;
    o.meshes.push(board(front, 0, 6.3, out + face * .13, 5.3, 1.55, face < 0, index), board(behind, 0, 6.2, z - face * (depth / 2 + .02), 4.4, 1.3, face > 0, index));
    for (const s of [-1, 1]) { emit(G.box, M.timber, s * 10.7, 4.3, out + face * .9, .1, .1, .7); paperLantern(s * 10.7, 3.75, out + face * 1.18, 1.4); }
    anchor(0, 3.9, out + face * 1.1, 17);
  }
  function hall() {
    zone = 6;
    facade(62.2, 2, 1, '鎮 祟 山 門', '借 名 殿', 6); emit(G.box, M.stone, 0, .012, 62, 10.1, .05, 2.2); seal(6, 0, 62, 4.5);
    facade(14.2, 2.4, -1, '借 名 殿', '鎮 祟 門', 6); emit(G.box, M.stone, 0, .012, 14, 10.1, .05, 2.6); seal(7, 0, 14, 4.5);
    // The great roof, and outer walls for whoever looks at the hall from outside it.
    emit(G.hip, M.tile, 0, 9.9, 38.2, 17.8, 6, 27); emit(G.box, M.stone, 0, 15.95, 38.2, 8.6, .3, .4);
    for (const s of [-1, 1]) { const m = add(new THREE.Mesh(G.plane, real(M.ochre))); m.position.set(s * 14.8, 4.9, 38.2); m.scale.set(45.6, 9.9, 1); m.rotation.y = s * HALF; occluder(38, x => s * x > 12).meshes.push(m); }
    // Inside: walls that follow the road, a pillar every bay, and between the pillars curtains of name tablets.
    const rows = Math.round(17 * (mobile ? .7 : 1)), pitch = mobile ? .4 : .27;
    for (const s of [-1, 1]) {
      wall(s, 61.1, 15.4, 1.78, 0, 0, 9.7, M.panel, { outer: false, top: false, scale: 4 }); wall(s, 61.1, 15.4, 1.7, .1, 0, 1.05, M.timber, { outer: false });
      let px = null, pz = 0, bay = 0;
      walk(s, 60.3, 16.1, 4.3, .98, f => {
        cast = true; emit(G.cyl, M.stone, f.x, .2, f.z, .38, .4, .38); emit(G.cyl, M.red, f.x, 5, f.z, .31, 9.3, .31); cast = false; emit(G.cyl, M.bronze, f.x, .46, f.z, .34, .1, .34); for (const y of [8, 8.26]) emit(G.box, M.red, f.x, y, f.z, .8 + (y - 8) * 2, .18, 1.5, 0, f.yaw);
        if (px !== null) {
          const ax = px + f.nx * .36, az = pz + f.nz * .36, bx = f.x + f.nx * .36, bz = f.z + f.nz * .36, len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az) - HALF + (s > 0 ? Math.PI : 0), cols = Math.floor((len - .5) / pitch), mx = (px + f.x) / 2, mz = (pz + f.z) / 2, shelf = bay % 3 === 1;
          beam(G.box, M.timber, ax, 7.95, az, bx, 7.95, bz, .1, .1);
          for (let c = 0; c < cols; c++) { const t = (c + .5) / cols * (1 - .5 / len) + .25 / len, x = mix(ax, bx, t), z = mix(az, bz, t); if (!free(x, z, -.5)) continue; const low = shelf ? 2.5 : 1.35, drop = rnd() * .3; emit(G.box, M.rope, x, (7.9 + low) / 2, z, .01, 7.9 - low, .01);
            for (let k = 0; k < rows; k++) { const y = 7.62 - k * .37 - drop; if (y < low) break; shade = .55 + rnd() * .6; emit(G.tablets[Math.floor(rnd() * 4)], M.tablet, x, y, z, 1.25, 1.25, 1.25, 0, yaw + (rnd() - .5) * .5); } } shade = 1;
          if (free(mx, mz, .2)) { paperLantern(mx, 3.7, mz, 1.3, bay % 2 === 0); emit(G.box, M.rope, mx, 5.95, mz, .014, 4, .014); }
          if (shelf) { const L = at(mx + f.nx * .28, 0, mz + f.nz * .28, yaw); cast = true; L(G.box, M.timber, 0, .55, 0, 3.1, 1.1, .46); cast = false; for (let i = 0; i < 7; i++) { const lx = -1.3 + i * .43 + (rnd() - .5) * .1; if (rnd() < .5) { shade = .5 + rnd() * .5; L(G.box, M.paper, lx, 1.16 + rnd() * .04, 0, .3, .1 + rnd() * .1, .36, 0, (rnd() - .5) * .3); shade = 1; } else L(G.cyl, M.paper, lx, 1.16, 0, .05, .36, .05, HALF, (rnd() - .5) * .6); } L(G.cyl, M.paper, 1.35, 1.22, 0, .03, .24, .03); L(G.ball, M.glow, 1.35, 1.38, 0, .03, .06, .03); halo(L.x(1.35, 0), 1.4, L.z(1.35, 0), .9); }
          bay++;
        }
        px = f.x; pz = f.z;
      });
    }
    add(new THREE.Mesh(new THREE.PlaneGeometry(31, 50).rotateX(HALF), M.ceiling)).position.set(0, 9.7, 38.2);
    for (let z = 58.4; z > 17; z -= 4.3) {
      emit(G.box, M.timber, 0, 8.6, z, 24.6, .5, .42);
      // More tablets hang from every beam, above the reach of any lens.
      for (let x = -9.6; x <= 9.6; x += mobile ? .7 : .36) { const n = 1 + Math.floor(rnd() * 3), zz = z + (rnd() - .5) * .2; emit(G.box, M.rope, x, 8.35 - n * .18, zz, .01, n * .36, .01); for (let k = 0; k < n; k++) { shade = .5 + rnd() * .6; emit(G.tablets[Math.floor(rnd() * 4)], M.tablet, x, 8.17 - k * .36, zz, 1.2, 1.2, 1.2, 0, rnd() * TAU); } } shade = 1;
    }
    for (const x of [-8, -4, 0, 4, 8]) emit(G.box, M.timber, x, 9.2, 38.2, .3, .36, 46);
    { const m = add(new THREE.Mesh(G.flat, roofed(std({ map: runnerTexture(), roughness: .95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })))); m.position.set(0, .012, 38); m.scale.set(3.4, 1, 39); m.receiveShadow = true; }
  }

  // ----- distant shapes so the horizon is never empty
  function horizon() {
    for (let z = 402; z > 86; z -= 8 + rnd() * 8) for (const s of [-1, 1]) { if (rnd() < .22) continue; zone = zoneIndex(clamp(z, 11, 339)); const x = s * (50 + rnd() * 40), h = 26 + rnd() * 38, r = 13 + rnd() * 13; shade = .8 + rnd() * .35; emit(G.peak, M.peak, x, ground(x, clamp(z, 11, 372)) - 5, z, r, h, r, 0, rnd() * TAU); }
    zone = 0; for (let i = 0; i < 6; i++) { shade = .8 + rnd() * .3; emit(G.peak, M.peak, -44 + i * 17 + rnd() * 6, -4, 388 + rnd() * 16, 14 + rnd() * 10, 30 + rnd() * 30, 14 + rnd() * 10, 0, rnd() * TAU); } shade = 1;
  }

  // ----- the ground: one sheet of land per region, plus paving where the region has any
  const rowZ = [...new Set([...Array.from({ length: 363 }, (_, i) => 372 - i), ...STATIONS.map(s => s[0])])].sort((a, b) => b - a);
  const tints = EARTH.map(c => new THREE.Color(c)), tint = new THREE.Color();
  function row(z, sunk = false) {
    const b = bounds(z), a = apron(z), w = b.max - b.min, m = zoneMix(z, 4); tint.copy(tints[m.a]).lerp(tints[m.b], m.t);
    const xs = [], ys = [], cs = [], inner = [b.min - a, b.min, b.min + w * .2, (b.min + b.max) / 2, b.max - w * .2, b.max, b.max + a], path = [.74, .9, 1, 1.07, 1, .9, .74];
    for (let k = COLUMNS.length - 1; k > 0; k--) xs.push(b.min - a - COLUMNS[k]); const first = xs.length; xs.push(...inner); for (let k = 1; k < COLUMNS.length; k++) xs.push(b.max + a + COLUMNS[k]);
    xs.forEach((x, i) => { const k = i - first, inside = k >= 0 && k < inner.length, d = inside ? 0 : k < 0 ? b.min - a - x : x - b.max - a; ys.push(inside ? (sunk || Math.hypot(x, z) < 12.46 ? -.045 : 0) : sunk ? -1.15 : ground(x, z)); cs.push(inside ? path[k] : mix(.74, .42, smooth(0, 34, d)) * (.86 + .28 * noise(x * .19, z * .19))); });
    return { z, xs, ys, cs, first, last: first + inner.length - 1, tint: [tint.r, tint.g, tint.b] };
  }
  function land(rim) {
    const paving = [null, null, null, null, M.warm, M.flag, M.slab, M.flag], size = [14, 14, 14, 14, 11.7, 11.7, 8, 11.7];
    ZONES.forEach((zn, index) => {
      const south = index === 0 ? 372 : zn.from, north = index === ZONES.length - 1 ? 10 : zn.to, list = rowZ.filter(z => z <= south && z >= north && !(index === 3 && z < 187.5 && z > 162.5)).map(z => row(z)); if (index === ZONES.length - 1) list.push({ ...row(10, true), z: 9.4 });
      const sheet = () => ({ pos: [], uv: [], col: [], idx: [] }), earth = sheet(), paved = paving[index] ? sheet() : earth;
      const fill = (s, from, to, scale, flat) => { const o = s.pos.length / 3, n = to - from + 1; list.forEach(r => { for (let i = from; i <= to; i++) { s.pos.push(r.xs[i], r.ys[i], r.z); s.uv.push(r.xs[i] / scale, r.z / scale); const c = flat ? Math.max(.8, r.cs[i]) : r.cs[i]; s.col.push(flat ? c : c * r.tint[0], flat ? c : c * r.tint[1], flat ? c : c * r.tint[2]); } }); for (let j = 0; j < list.length - 1; j++) { if (index === 3 && list[j].z === 187.5) continue; for (let i = 0; i < n - 1; i++) { const a = o + j * n + i, b = a + 1, c = a + n, d = c + 1; s.idx.push(a, b, c, b, d, c); } } };
      const cols = list[0].xs.length, first = list[0].first, last = list[0].last;
      fill(earth, 0, first, 14, false); fill(earth, last, cols - 1, 14, false); fill(paved, first, last, size[index], paved !== earth);
      for (const [s, mat] of paved === earth ? [[earth, M.earth]] : [[earth, M.earth], [paved, paving[index]]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(s.col, 3)); g.setIndex(s.idx); g.computeVertexNormals(); const m = add(new THREE.Mesh(g, mat), index); m.receiveShadow = true; }
      if (index === 3) { rim.south = list.find(r => r.z === 187.5); rim.north = list.find(r => r.z === 162.5); }
    });
  }

  // ----- pickups: a small stele with its rubbing still on it, or a roadside shrine with one lamp lit
  const NAMES = ['阿禾', '柳七', '周大山', '陳三娘', '趙鐵', '林晚', '孫穗', '沈寒舟', '徐青', '馬小滿', '吳守田', '何老栓'];
  const beamMap = beamTexture(), glowOf = (color, opacity) => basic({ color, map: beamMap, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  function pickupProps() {
    let rubbing = 0;
    for (const p of pickups) {
      zone = zoneIndex(p.z); const L = at(p.x, 0, p.z, p.yaw), index = zone, shrine = p.item.kind === 'shrine'; cast = true;
      if (shrine) {
        L(G.box, M.stone, 0, .2, 0, 1, .4, .8); L(G.box, M.dark, 0, .78, -.05, .8, .76, .6); L(G.box, M.black, 0, .76, .26, .46, .5, .04); L(G.gable, M.tile, 0, 1.16, -.02, .62, .34, .5); cast = false; L(G.cyl, M.stone, 0, .66, .1, .1, .3, .1); L(G.box, M.cloth, 0, .9, .27, .5, .12, .02); for (const sx of [-.12, 0, .12]) L(G.cyl, M.paper, sx, .58, .33, .008, .3, .008, .2);
        const lamp = add(new THREE.Mesh(G.box, std({ color: '#dca268', emissive: '#ff8a30', emissiveIntensity: 3, roughness: .8 })), index); lamp.position.set(L.x(.3, .3), .5, L.z(.3, .3)); lamp.scale.set(.12, .18, .12); p.lit = lamp; p.power = 3; p.light = anchor(L.x(.3, .5), .9, L.z(.3, .5), 12); p.haloAt = [L.x(.3, .3), .52, L.z(.3, .3), 1.6, WARM]; p.tint = '#b8f0d6';
      } else {
        L(G.box, M.dark, 0, .11, 0, .62, .22, .44); L(G.box, M.stele, 0, .84, 0, .5, 1.24, .15); L(G.box, M.dark, 0, 1.52, 0, .6, .12, .24); cast = false;
        const paper = add(new THREE.Mesh(G.plane, std({ map: rubbingTexture(NAMES[rubbing % NAMES.length]), emissive: '#ffd9a0', emissiveIntensity: .9, roughness: 1 })), index); paper.material.emissiveMap = paper.material.map; paper.position.set(L.x(0, .082), .88, L.z(0, .082)); paper.rotation.y = p.yaw; paper.scale.set(.37, .74, 1); p.lit = paper; p.power = .9;
        const shaft = add(new THREE.Mesh(G.plane, glowOf('#ffd9a0', .3)), index); shaft.position.set(p.x, 6.4, p.z); shaft.scale.set(1.1, 11, 1); shaft.renderOrder = 2; p.shaft = shaft; p.haloAt = [L.x(0, .2), .95, L.z(0, .2), 1.5, [.9, .62, .28]]; p.tint = '#ffd9a0'; rubbing++;
      }
      const mark = add(new THREE.Mesh(G.mark, basic({ color: p.tint, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), index); mark.position.set(p.item.x, .04, p.item.z); mark.renderOrder = 2; p.mark = mark; p.group = groups[index];
    }
    cast = false;
  }

  // ----- assemble
  const rim = {}; land(rim);
  village(); gate(0, M.timber, M.plaster); bamboo(); zone = 1; gate(1, M.timber, M.timber); gate(2, M.timber, M.timber); steles(); gate(3, M.stone, M.dark); ravine(rim); gate(4, M.stone, M.dark); lanternRoad(); gate(5, M.red, M.ochre); forecourt(); hall(); horizon(); pickupProps();
  for (const b of batches.values()) { const m = new THREE.InstancedMesh(b.geo, b.mat, b.matrices.length); b.matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix)); if (b.tinted) { const c = new THREE.Color(); for (let i = 0; i < b.matrices.length; i++) m.setColorAt(i, c.setRGB(b.colors[i * 3], b.colors[i * 3 + 1], b.colors[i * 3 + 2])); } m.castShadow = b.cast; m.receiveShadow = true; m.computeBoundingSphere(); groups[b.zone].add(m); b.mesh = m; }
  for (const s of sheets.values()) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2)); g.setIndex(s.idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, s.mat); m.castShadow = s.shadow; m.receiveShadow = true; groups[s.zone].add(m); }
  for (const o of occluders) { o.parts = o.refs.map(r => ({ mesh: r.batch.mesh, index: r.index, matrix: r.batch.matrices[r.index] })); o.refs = null; }
  // Lantern glow: camera-facing discs drawn in one call per region, thinned by the same fog as everything else.
  const haloMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { time, haze },
    vertexShader: `uniform float time;uniform float haze;varying vec2 vUv;varying vec3 vTint;varying float vFade;
void main(){vec4 c=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);float size=length(instanceMatrix[0].xyz);vec4 mv=viewMatrix*c;float flick=.9+.1*sin(time*7.+c.x*3.1+c.z*1.7);
mv.xy+=position.xy*size*flick;vUv=position.xy*2.;vTint=instanceColor;float f=haze*length(mv.xyz);vFade=exp(-f*f)*smoothstep(.5,2.2,-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'varying vec2 vUv;varying vec3 vTint;varying float vFade;void main(){float r=length(vUv);float a=pow(max(0.,1.-r),2.3)*.6*vFade;if(a<.003)discard;gl_FragColor=vec4(vTint,a);}'
  });
  const pickupHalo = pickups.map(p => p.haloAt), tintOf = new THREE.Color();
  function haloMesh(list, parent) { if (!list.length) return null; const m = new THREE.InstancedMesh(G.plane, haloMaterial, list.length); list.forEach(([, x, y, z, size, c], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(size); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tintOf.setRGB(c[0], c[1], c[2])); }); m.computeBoundingSphere(); m.boundingSphere.radius += 3; m.renderOrder = 7; parent.add(m); return m; }
  groups.forEach((g, i) => haloMesh(halos.filter(h => h[0] === i), g));
  const pickupGlow = haloMesh(pickupHalo.map(h => [0, ...h]), root); pickupGlow.frustumCulled = false;
  // What each batch occupies: it is dropped while the lens looks elsewhere, and throws a shadow only while the hero is near enough to see one.
  // Meshes whose visibility something else already owns (pickups, seals, see-through walls) are left alone.
  const owned = new Set(); for (const o of occluders) for (const m of o.meshes) owned.add(m); for (const g of gates) { owned.add(g.barrier); owned.add(g.ring); } for (const p of pickups) for (const m of [p.lit, p.mark, p.shaft]) if (m) owned.add(m);
  root.updateMatrixWorld(true); const cull = [];
  groups.forEach((g, zone) => { for (const mesh of g.children) { if (!mesh.isMesh || owned.has(mesh)) continue; const box = new THREE.Box3(); if (mesh.isInstancedMesh) { mesh.computeBoundingBox(); box.copy(mesh.boundingBox); } else { mesh.geometry.computeBoundingBox(); box.copy(mesh.geometry.boundingBox); } box.applyMatrix4(mesh.matrixWorld).expandByScalar(2.5); cull.push({ mesh, box, zone, cast: mesh.castShadow, lit: mesh.castShadow }); } });

  // Gold chevrons that run along the ground toward the open gate.
  const chevrons = new THREE.InstancedMesh(chevronGeometry(), basic({ color: '#ffd27a', transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 12); chevrons.frustumCulled = false; chevrons.renderOrder = 2; chevrons.visible = false; for (let i = 0; i < 12; i++) { chevrons.setMatrixAt(i, dummy.matrix); chevrons.setColorAt(i, tintOf.setScalar(0)); } root.add(chevrons);
  // A band of the region's own haze round the horizon, so distance fades into the air instead of into another colour.
  const skyline = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 320, 40, 1, true), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, uniforms: { tint: { value: new THREE.Color() }, flash: { value: 0 } }, vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 tint;uniform float flash;varying vec3 vDir;void main(){float h=normalize(vDir).y;gl_FragColor=vec4(tint*(1.+flash*1.3),(1.-smoothstep(.03,.34,h))*.94);}' })); skyline.frustumCulled = false; skyline.renderOrder = -9; root.add(skyline);
  // A fixed pool of lights: they move to whichever lanterns are nearest the hero and are never added or removed.
  const lights = Array.from({ length: 4 }, () => { const l = new THREE.PointLight('#ff9c52', 0, 15, 2); l.position.set(0, -50, 340); world.scene.add(l); return l; });
  // Build programs and upload textures now, behind the loading screen, not on the first step into each region.
  try { const r = world.renderer, target = r.getRenderTarget(); root.visible = true; if (world.post?.sceneTarget) r.setRenderTarget(world.post.sceneTarget); r.compile(root, world.camera, world.scene); r.setRenderTarget(target); root.traverse(o => { const m = o.material; if (m) for (const key of ['map', 'bumpMap', 'roughnessMap', 'alphaMap']) if (m[key]) r.initTexture(m[key]); }); } catch (error) { console.warn('journey scenery: precompile skipped', error); } root.visible = false;
  return { groups, cull, gates, pickups, anchors, occluders, lights, chevrons, skyline, mists, barrierMap, pickupGlow, time, haze, focus, moods: ZONES.map(z => ({ fog: new THREE.Color(z.mood.fog), density: z.mood.density, rain: z.mood.rain, light: z.mood.light })) };
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), SHADE = 24;
export class JourneyScenery {
  constructor(world) {
    this.world = world; this.root = new THREE.Group(); this.root.name = 'journey'; this.root.visible = false; world.scene.add(this.root);
    Object.assign(this, construct(world, this.root));
    this.on = false; this.fresh = true; this.air = { fog: new THREE.Color('#26373f'), density: .022, rain: 1, light: 1, sun: 1 }; this.goal = new THREE.Color();
    this.best = new Int16Array(5); this.bestD = new Float32Array(5); this.dummy = new THREE.Object3D(); this.tint = new THREE.Color();
    this.hemisphere = world.hemisphere || null; this.rim = world.rim || null; this.base = null;
    this.frustum = new THREE.Frustum(); this.view = new THREE.Matrix4(); this.near = new THREE.Box3();
  }
  // The courtyard's own air, kept to put back the moment the campaign is not on screen.
  enter() {
    const w = this.world, a = w.atmosphere; this.on = true; this.fresh = true; this.root.visible = true;
    this.base = { fog: w.scene.fog.color.clone(), density: w.scene.fog.density, sun: w.sun.intensity, rim: this.rim?.intensity, hemisphere: this.hemisphere?.intensity, moon: a?.moonlight.intensity, environment: w.scene.environmentIntensity };
  }
  leave() {
    const w = this.world, a = w.atmosphere, b = this.base; this.on = false; this.root.visible = false; for (const l of this.lights) l.intensity = 0;
    w.scene.fog.color.copy(b.fog); w.scene.fog.density = b.density; w.sun.intensity = b.sun; if (this.rim) this.rim.intensity = b.rim; if (this.hemisphere) this.hemisphere.intensity = b.hemisphere; w.scene.environmentIntensity = b.environment;
    if (a) { a.moonlight.intensity = b.moon; for (const m of [a.rain, a.splashes]) { m.visible = true; m.geometry.setDrawRange(0, Infinity); } }
  }
  reset() { this.fresh = true; for (const p of this.pickups) p.shown = -1; }
  setHidden(o, hidden) { o.hidden = hidden; for (const p of o.parts) { p.mesh.setMatrixAt(p.index, hidden ? ZERO : p.matrix); p.mesh.instanceMatrix.needsUpdate = true; } for (const m of o.meshes) m.visible = !hidden; }
  update(game, t, dt, active) {
    if (!active || !game?.campaign) { if (this.on) this.leave(); return; }
    if (!this.on) this.enter();
    const w = this.world, p = game.player, cam = w.camera.position, air = this.air, snap = this.fresh, k = snap ? 1 : 1 - Math.exp(-dt * 2.4); this.fresh = false;
    this.time.value = t; this.focus.value.set(p.x, 1.1, p.z).applyMatrix4(w.camera.matrixWorldInverse);
    // Air: fog, rain and light drift toward the region the hero stands in, blending across each border.
    const m = zoneMix(p.z, 7), A = this.moods[m.a], B = this.moods[m.b]; this.goal.copy(A.fog).lerp(B.fog, m.t); air.fog.lerp(this.goal, k);
    air.density += (mix(A.density, B.density, m.t) - air.density) * k; air.rain += (mix(A.rain, B.rain, m.t) - air.rain) * k; air.light += (mix(A.light, B.light, m.t) - air.light) * k; air.sun += (mix(SUN[m.a], SUN[m.b], m.t) - air.sun) * k;
    const scene = w.scene, b = this.base, atmosphere = w.atmosphere; scene.fog.color.copy(air.fog); scene.fog.density = air.density; this.haze.value = air.density;
    w.sun.intensity = b.sun * air.light * air.sun; if (this.rim) this.rim.intensity = b.rim * air.light * (.25 + .75 * air.sun); if (this.hemisphere) this.hemisphere.intensity = b.hemisphere * air.light; scene.environmentIntensity = b.environment * air.light;
    if (atmosphere) {
      atmosphere.moonlight.intensity = b.moon * air.light * air.sun;
      const streaks = atmosphere.rain, splashes = atmosphere.splashes, wet = air.rain > .02; streaks.visible = splashes.visible = wet;
      streaks.geometry.setDrawRange(0, Math.round(streaks.geometry.attributes.position.count / 2 * air.rain) * 2); splashes.geometry.setDrawRange(0, Math.round(splashes.geometry.attributes.position.count * air.rain));
      this.skyline.material.uniforms.flash.value = atmosphere.flash;
    }
    this.skyline.position.copy(cam); this.skyline.material.uniforms.tint.value.copy(air.fog);
    // Regions the fog has closed over, or that lie wholly behind the lens, are not drawn; only the ground near the hero throws shadows.
    const sight = clamp(1.3 / air.density, 45, 90); this.frustum.setFromProjectionMatrix(this.view.multiplyMatrices(w.camera.projectionMatrix, w.camera.matrixWorldInverse));
    for (let i = 0; i < ZONES.length; i++) { const south = i === 0 ? JOURNEY.south + 40 : ZONES[i].from; this.groups[i].visible = p.z < south + sight && p.z > ZONES[i].to - sight; }
    this.near.min.set(p.x - SHADE, -80, p.z - SHADE); this.near.max.set(p.x + SHADE, 80, p.z + SHADE);
    for (const c of this.cull) { if (!this.groups[c.zone].visible) continue; const lit = c.cast && c.box.intersectsBox(this.near); if (lit !== c.lit) { c.lit = lit; c.mesh.castShadow = lit; } c.mesh.visible = lit || (this.frustum.intersectsBox(c.box) && c.box.distanceToPoint(cam) < sight); }
    for (const mist of this.mists) mist.map.offset.x = t * mist.speed;
    // Lights: the four nearest lit lanterns. Each fades out before the fifth could take its place, so a swap never shows.
    const anchors = this.anchors, best = this.best, bestD = this.bestD; bestD.fill(Infinity); best.fill(-1);
    for (let i = 0; i < anchors.length; i++) { const a = anchors[i]; if (a.on <= .001) continue; const d = (a.x - p.x) * (a.x - p.x) + (a.z - p.z) * (a.z - p.z); if (d >= bestD[4]) continue; let j = 4; while (j > 0 && bestD[j - 1] > d) { bestD[j] = bestD[j - 1]; best[j] = best[j - 1]; j--; } bestD[j] = d; best[j] = i; }
    const far = Math.sqrt(bestD[4]);
    for (let j = 0; j < 4; j++) { const light = this.lights[j], i = best[j]; if (i < 0) { light.intensity = 0; continue; } const a = anchors[i], d = Math.sqrt(bestD[j]); light.position.set(a.x, a.y, a.z); light.intensity = a.power * a.on * (1 - smooth(12, 24, d)) * (far === Infinity ? 1 : 1 - smooth(far * .6, far * .96, d)) * (1 + Math.sin(t * 8 + i * 1.7) * .04); }
    // Gates: a red seal across the doorway while its chapter stands, a gold ring on the threshold once it falls.
    this.barrierMap.offset.y = -t * .06;
    for (const g of this.gates) {
      const open = game.stage > g.index || (game.stage === g.index && game.cleared), current = game.stage === g.index; g.open = snap ? (open ? 1 : 0) : g.open + ((open ? 1 : 0) - g.open) * (1 - Math.exp(-dt * 3));
      const d = Math.hypot(g.x - cam.x, g.z - cam.z) * air.density, thin = Math.exp(-d * d);
      g.barrier.visible = g.open < .98; g.barrier.material.opacity = (1 - g.open) * (.5 + Math.sin(t * 2.3 + g.index) * .1) * thin * smooth(1.5, 5.5, Math.abs(cam.z - g.z)); g.barrier.scale.y = 4.8 * (1 - g.open * .5);
      g.ring.visible = g.open > .02; g.ring.material.opacity = g.open * (current ? .6 + Math.sin(t * 3.2) * .25 : .14) * thin; g.ring.scale.setScalar(current ? 1 + Math.sin(t * 3.2) * .05 : 1);
    }
    // Pickups: taken ones stay where they were, but dark.
    for (let i = 0; i < this.pickups.length; i++) {
      const q = this.pickups[i], want = game.collected.has(q.item.id) ? 0 : 1; q.glow = snap ? want : q.glow + (want - q.glow) * (1 - Math.exp(-dt * 4)); const near = q.group.visible && Math.abs(q.z - p.z) < 70; q.lit.visible = near; q.mark.visible = near && q.glow > .02; if (q.shaft) q.shaft.visible = q.mark.visible; if (!near) continue;
      const pulse = .85 + Math.sin(t * 2.4 + i) * .15, d = Math.hypot(q.x - cam.x, q.z - cam.z) * air.density, thin = Math.exp(-d * d);
      q.lit.material.emissiveIntensity = q.power * (.06 + .94 * q.glow) * pulse; q.mark.material.opacity = .42 * q.glow * pulse * thin; if (q.shaft) { q.shaft.material.opacity = .5 * q.glow * thin; q.shaft.rotation.y = Math.atan2(cam.x - q.x, cam.z - q.z); } if (q.light) q.light.on = q.glow;
      const shown = Math.round(q.glow * 20); if (shown !== q.shown) { q.shown = shown; const c = q.haloAt[4]; this.pickupGlow.setColorAt(i, this.tint.setRGB(c[0] * q.glow, c[1] * q.glow, c[2] * q.glow)); this.pickupGlow.instanceColor.needsUpdate = true; }
    }
    // The way on, once the chapter is cleared.
    const goal = game.cleared ? game.waypoint() : null, chevrons = this.chevrons; chevrons.visible = !!goal && goal.kind === 'gate';
    if (chevrons.visible) {
      const dx = goal.x - p.x, dz = goal.z - p.z, length = Math.hypot(dx, dz), phase = (t * .9) % 1, o = this.dummy;
      for (let i = 0; i < 12; i++) {
        const s = 1.8 + (i + phase) * 1.9, u = s / Math.max(length, .001), fade = Math.sin(Math.PI * (i + phase) / 12);
        if (s > length - .6) { o.scale.setScalar(0); } else {
          const z = p.z + dz * u, e = bounds(z), x = clamp(p.x + dx * u, e.min + 1, e.max - 1), u2 = Math.min(1, (s + .6) / length), z2 = p.z + dz * u2, e2 = bounds(z2), x2 = clamp(p.x + dx * u2, e2.min + 1, e2.max - 1);
          o.position.set(x, .05, z); o.rotation.set(0, Math.atan2(x - x2, z - z2), 0); o.scale.setScalar(.8);
        }
        o.updateMatrix(); chevrons.setMatrixAt(i, o.matrix); chevrons.setColorAt(i, this.tint.setScalar(fade * fade));
      }
      chevrons.instanceMatrix.needsUpdate = true; chevrons.instanceColor.needsUpdate = true;
    }
    // Roofs and walls that come between the lens and the hero step aside for as long as they do.
    for (const o of this.occluders) {
      let hit = false; if (Math.abs(o.z - p.z) < 45) for (let j = 1; j <= 9 && !hit; j++) { const u = j * .1 - .04; hit = o.test(mix(cam.x, p.x, u), mix(cam.y, 1.4, u), mix(cam.z, p.z, u)); }
      o.hold = hit ? .3 : Math.max(0, o.hold - dt); const hidden = o.hold > 0; if (hidden !== o.hidden) this.setHidden(o, hidden);
    }
  }
}
