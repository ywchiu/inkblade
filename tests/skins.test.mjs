import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { createWolfCharacter, animateWolf, WOLF_SHAPE, BEAST_SHAPE } from '../dist/wolf-character3d.js';
import { ROLES } from '../dist/campaign3d.js';
import { SKINS } from '../dist/characters3d.js';
import { RIGS, RONIN_RIG, clipCandidates } from '../dist/rig-clips.js';
import { parseGlb, writeGlb } from '../scripts/prepare-rig-input.mjs';
import { compressTextures } from '../scripts/compress-textures.mjs';

// A box as long, wide and tall as the beast, facing -Z like the source mesh (the builder turns it round).
function block(shape, [w, l]) {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(w, shape.height, l, 8, 12, 24), new THREE.MeshStandardMaterial()));
  return { scene };
}
const weightsAt = (model, test) => {
  const geometry = model.meshes[0].geometry, pos = geometry.attributes.position, index = geometry.attributes.skinIndex, weight = geometry.attributes.skinWeight, p = new THREE.Vector3(), found = [];
  for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i); if (!test(p)) continue; const row = {}; for (let j = 0; j < 4; j++) { const w = weight.getComponent(i, j); if (w > 0) row[model.skeleton.bones[index.getComponent(i, j)].name] = w; } found.push(row); }
  return found;
};

test('every role that asks for a body of its own names one the loader knows', () => {
  for (const [role, def] of Object.entries(ROLES)) if (def.skin) assert.ok(SKINS.includes(def.skin), role);
  assert.equal(ROLES.lion.skin, 'beast'); assert.equal(ROLES.scribe.skin, 'scribe');
});

test('the clerk wears its own mesh on the swordsman\'s clips, and 點名 is the thrust', () => {
  const rig = RIGS.scribe;
  assert.notEqual(rig.rig, RONIN_RIG.rig); assert.equal(rig.clips, RONIN_RIG.clips); assert.equal(rig.weaponBone, 'RightHand');
  assert.equal(clipCandidates({ state: 'windup', kind: 'projectile', variant: 'sword-cross' }, rig.moves)[0], 'thrust');
  assert.equal(clipCandidates({ state: 'windup', kind: 'projectile', variant: 'sword-cross' }, RONIN_RIG.moves)[0], 'slashLeft');
});

test('both four-legged shapes skin a body to full weight and stand it at its height', () => {
  for (const [shape, size] of [[WOLF_SHAPE, [.88, 2.97]], [BEAST_SHAPE, [1.08, 2.56]]]) {
    const model = createWolfCharacter(block(shape, size), shape), box = new THREE.Box3().setFromBufferAttribute(model.meshes[0].geometry.attributes.position);
    assert.ok(Math.abs(box.min.y) < 1e-6); assert.ok(Math.abs(box.max.y - shape.height) < 1e-6); assert.equal(model.asset, shape.asset); assert.equal(model.skeleton.bones.length, 20);
    for (const row of weightsAt(model, () => true)) assert.ok(Math.abs(Object.values(row).reduce((a, b) => a + b, 0) - 1) < 1e-5);
  }
});

test('the beast carries its tail level, and what hangs between its forelegs stays on the body', () => {
  const model = createWolfCharacter(block(BEAST_SHAPE, [1.08, 2.56]), BEAST_SHAPE);
  // High and behind the rump is tail; low and behind the rump is not (the wolf's tail hangs, the beast's does not).
  const tail = weightsAt(model, p => p.z < -1 && p.y > 1);
  assert.ok(tail.length); for (const row of tail) assert.ok(Object.keys(row).every(name => name.startsWith('Tail')));
  // The bell under the jaw: low, on the centre line, level with the forelegs.
  const bell = weightsAt(model, p => Math.abs(p.x) < .05 && p.y < .3 && p.z > .5 && p.z < .9);
  assert.ok(bell.length); for (const row of bell) assert.ok(!Object.keys(row).some(name => /Front|Hind/.test(name)), JSON.stringify(row));
  // A forepaw is all leg.
  const paw = weightsAt(model, p => p.x > .35 && p.y < .05 && p.z > .6 && p.z < .9);
  assert.ok(paw.length); for (const row of paw) assert.ok(Object.keys(row).every(name => name.startsWith('FrontLeft')), JSON.stringify(row));
});

test('a fallen beast lies on its own flank, not on the wolf\'s', () => {
  const model = createWolfCharacter(block(BEAST_SHAPE, [1.08, 2.56]), BEAST_SHAPE), actor = { x: 0, z: 0, yaw: 0, speed: 0, state: 'dead', timer: 0, total: 0, flash: 0 };
  for (let i = 0; i < 60; i++) animateWolf(model, actor, i / 60, 1 / 60);
  assert.equal(model.deathProgress, 1); assert.ok(Math.abs(model.body.position.y - BEAST_SHAPE.lie[0]) < 1e-6);
});

test('texture compression swaps every image for WebP and keeps geometry bytes where the accessors expect them', async () => {
  const geometry = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), png = new Uint8Array(40).fill(9), jpg = new Uint8Array(21).fill(7), bin = new Uint8Array(72);
  bin.set(geometry, 0); bin.set(png, 8); bin.set(jpg, 48);
  const json = { asset: { version: '2.0' }, buffers: [{ byteLength: 72 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 8 }, { buffer: 0, byteOffset: 8, byteLength: 40 }, { buffer: 0, byteOffset: 48, byteLength: 21 }],
    images: [{ bufferView: 1, mimeType: 'image/png' }, { bufferView: 2, mimeType: 'image/jpeg' }], textures: [{ sampler: 0, source: 1 }, { sampler: 0, source: 0 }] };
  const seen = [], out = parseGlb(await compressTextures(writeGlb(json, bin), async (bytes, mime, i) => { seen.push([mime, bytes.length]); return new Uint8Array(5 + i).fill(100 + i); }));
  assert.deepEqual(seen, [['image/png', 40], ['image/jpeg', 21]]);
  assert.deepEqual(out.json.images.map(i => i.mimeType), ['image/webp', 'image/webp']);
  assert.deepEqual(out.json.textures, [{ sampler: 0, extensions: { EXT_texture_webp: { source: 1 } } }, { sampler: 0, extensions: { EXT_texture_webp: { source: 0 } } }]);
  assert.deepEqual(out.json.extensionsRequired, ['EXT_texture_webp']);
  const [g, a, b] = out.json.bufferViews;
  assert.deepEqual([...out.bin.subarray(g.byteOffset, g.byteOffset + g.byteLength)], [...geometry]);
  assert.deepEqual([...out.bin.subarray(a.byteOffset, a.byteOffset + a.byteLength)], [100, 100, 100, 100, 100]);
  assert.deepEqual([...out.bin.subarray(b.byteOffset, b.byteOffset + b.byteLength)], [101, 101, 101, 101, 101, 101]);
  assert.ok([g, a, b].every(view => view.byteOffset % 4 === 0)); assert.equal(out.json.buffers[0].byteLength, b.byteOffset + 6);
});
