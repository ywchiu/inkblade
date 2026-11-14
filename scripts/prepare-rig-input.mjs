#!/usr/bin/env node
// Auto-riggers assume a character that faces +Z, stands on the origin and has no
// node transforms. Image-to-3D output rarely does (our Tripo meshes face +X), and
// a rig fitted to a sideways mesh twists the legs. This bakes the correction into
// the vertex data so every service sees the same, unambiguous input.
//
//   node scripts/prepare-rig-input.mjs in.glb out.glb --yaw=-90 --height=1.9 [--strip-skin]
//
// --yaw is the rotation in degrees about +Y that turns the model to face +Z
// (-90 for a +X-facing mesh, 180 for -Z). --height rescales to metres; omit to keep.
// --strip-skin discards an existing rig and its clips so the mesh can be rigged again.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import * as THREE from '../dist/vendor/three.module.js';

const FLOAT = 5126, GLB = 0x46546C67, JSON_CHUNK = 0x4E4F534A, BIN_CHUNK = 0x004E4942;

export function parseGlb(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== GLB) throw new Error('Not a binary glTF file.');
  let offset = 12, json = null, bin = null;
  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true), data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(new TextDecoder().decode(data)); else if (type === BIN_CHUNK) bin = new Uint8Array(data);
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error('GLB needs one JSON chunk and one embedded binary chunk.');
  return { json, bin };
}

export function writeGlb(json, bin) {
  const pad = (bytes, fill) => { const extra = (4 - bytes.length % 4) % 4; if (!extra) return bytes; const out = new Uint8Array(bytes.length + extra).fill(fill); out.set(bytes); return out; };
  const text = pad(new TextEncoder().encode(JSON.stringify(json)), 0x20), data = pad(bin, 0), out = new Uint8Array(12 + 8 + text.length + 8 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, GLB, true); view.setUint32(4, 2, true); view.setUint32(8, out.length, true);
  view.setUint32(12, text.length, true); view.setUint32(16, JSON_CHUNK, true); out.set(text, 20);
  view.setUint32(20 + text.length, data.length, true); view.setUint32(24 + text.length, BIN_CHUNK, true); out.set(data, 28 + text.length);
  return out;
}

function nodeMatrix(node) {
  if (node.matrix) return new THREE.Matrix4().fromArray(node.matrix);
  return new THREE.Matrix4().compose(new THREE.Vector3(...(node.translation || [0, 0, 0])), new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(node.scale || [1, 1, 1])));
}

// Returns the rewritten GLB plus a report of what the rigger will receive.
export function normalizeGlb(buffer, { yaw = 0, height = null, stripSkin = false } = {}) {
  const { json, bin } = parseGlb(buffer);
  if (json.skins?.length && !stripSkin) throw new Error('Input is already skinned; start from the unrigged mesh or pass --strip-skin.');
  // Recover the bind-pose mesh from a rejected rig: drop joints, weights and clips.
  // A skinned mesh ignores its own node transform, so that node is reset as well.
  if (stripSkin) {
    for (const node of json.nodes) if (node.skin !== undefined) { delete node.skin; delete node.matrix; delete node.translation; delete node.rotation; delete node.scale; }
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) for (const name of Object.keys(primitive.attributes)) if (/^(JOINTS|WEIGHTS)_/.test(name)) delete primitive.attributes[name];
    delete json.skins; delete json.animations;
  }
  const used = json.extensionsRequired || [];
  if (used.some(name => /draco|meshopt|quantization/i.test(name))) throw new Error(`Compressed geometry (${used.join(', ')}) cannot be edited in place; use the original, uncompressed export.`);
  const data = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const reader = index => {
    const accessor = json.accessors[index], view = json.bufferViews[accessor.bufferView];
    if (accessor.componentType !== FLOAT || accessor.sparse || !view) throw new Error(`Accessor ${index} is not a plain float attribute.`);
    const size = { VEC3: 3, VEC4: 4 }[accessor.type], stride = view.byteStride || size * 4, start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    return { accessor, count: accessor.count, get: (i, k) => data.getFloat32(start + i * stride + k * 4, true), set: (i, k, v) => data.setFloat32(start + i * stride + k * 4, v, true) };
  };
  // World matrix of every mesh instance; a mesh shared by two nodes cannot be baked once.
  const instances = [], seenMesh = new Set();
  const walk = (index, parent) => { const node = json.nodes[index], world = parent.clone().multiply(nodeMatrix(node)); if (node.mesh !== undefined) { if (seenMesh.has(node.mesh)) throw new Error('A mesh is instanced by several nodes; flatten it first.'); seenMesh.add(node.mesh); instances.push({ mesh: json.meshes[node.mesh], world }); } for (const child of node.children || []) walk(child, world); };
  for (const root of json.scenes[json.scene || 0].nodes) walk(root, new THREE.Matrix4());
  const turn = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(yaw)), box = new THREE.Box3(), p = new THREE.Vector3(), touched = new Map();
  const each = fn => { for (const { mesh, world } of instances) for (const primitive of mesh.primitives) fn(primitive, world); };
  each((primitive, world) => { const pos = reader(primitive.attributes.POSITION), m = turn.clone().multiply(world); for (let i = 0; i < pos.count; i++) box.expandByPoint(p.set(pos.get(i, 0), pos.get(i, 1), pos.get(i, 2)).applyMatrix4(m)); });
  const size = box.getSize(new THREE.Vector3()), scale = height ? height / size.y : 1, center = box.getCenter(new THREE.Vector3());
  const place = new THREE.Matrix4().makeScale(scale, scale, scale).multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z)).multiply(turn);
  each((primitive, world) => {
    const m = place.clone().multiply(world), normal = new THREE.Matrix3().getNormalMatrix(m);
    for (const [name, kind] of [['POSITION', 'point'], ['NORMAL', 'direction'], ['TANGENT', 'direction']]) {
      const index = primitive.attributes[name]; if (index === undefined) continue;
      if (touched.has(index)) { if (touched.get(index) !== m.elements.join()) throw new Error('An accessor is shared by differently placed meshes.'); continue; }
      touched.set(index, m.elements.join());
      const attr = reader(index), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < attr.count; i++) {
        p.set(attr.get(i, 0), attr.get(i, 1), attr.get(i, 2)); if (kind === 'point') p.applyMatrix4(m); else p.applyMatrix3(normal).normalize();
        p.toArray().forEach((v, k) => { attr.set(i, k, v); min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v); });
      }
      if (name === 'POSITION') { attr.accessor.min = min; attr.accessor.max = max; }
    }
  });
  for (const node of json.nodes) { delete node.matrix; delete node.translation; delete node.rotation; delete node.scale; }
  const out = size.clone().multiplyScalar(scale), triangles = instances.reduce((n, { mesh }) => n + mesh.primitives.reduce((k, pr) => k + (pr.indices !== undefined ? json.accessors[pr.indices].count : json.accessors[pr.attributes.POSITION].count) / 3, 0), 0);
  return { glb: writeGlb(json, bin), report: { size: out.toArray().map(v => +v.toFixed(3)), triangles, wideAxis: out.x >= out.z ? 'x' : 'z', warning: out.x < out.z ? 'Model is deeper than it is wide: it probably still faces sideways. Check --yaw.' : null } };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [input, output, ...flags] = process.argv.slice(2), option = name => flags.find(f => f.startsWith(`--${name}=`))?.split('=')[1];
  if (!input || !output) { console.error('usage: prepare-rig-input.mjs in.glb out.glb --yaw=-90 [--height=1.9]'); process.exit(1); }
  const { glb, report } = normalizeGlb(new Uint8Array(await readFile(input)), { yaw: Number(option('yaw') || 0), height: option('height') ? Number(option('height')) : null, stripSkin: flags.includes('--strip-skin') });
  await writeFile(output, glb); console.log(JSON.stringify(report));
}
