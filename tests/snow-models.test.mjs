import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { RIGS, RONIN_RIG, ONI_RIG } from '../dist/rig-clips.js';

const file = src => new URL(`../dist/${src.replace(/^\.\//, '')}`, import.meta.url);
const MB = 1024 * 1024;

test('the snow bodies wear the shared skeleton, and only the crone brings clips of her own', () => {
  for (const id of ['crone', 'traveller', 'howler']) assert.ok(RIGS[id]?.rig.startsWith('./assets/snow/'), id);
  assert.equal(RIGS.traveller.clips, RONIN_RIG.clips);
  assert.equal(RIGS.howler.clips, ONI_RIG.clips);
  for (const c of ['cast', 'slam', 'wail']) {
    const clip = RIGS.crone.clips[c];
    assert.ok(clip.src.startsWith('./assets/snow/crone/'), c);
    assert.ok(clip.hit > clip.range[0] && clip.hit < clip.range[1], `${c} lands inside its own swing`);
  }
  for (const c of ['idle', 'hurt', 'death']) assert.equal(RIGS.crone.clips[c], RONIN_RIG.clips[c]);
  assert.deepEqual(Object.values(RIGS.crone.moves).sort(), ['cast', 'slam', 'wail']);
});

test('every snow body and clip is on disk and inside its budget', () => {
  for (const id of ['crone', 'traveller', 'howler']) assert.ok(statSync(file(RIGS[id].rig)).size <= 5 * MB, id);
  for (const c of ['cast', 'slam', 'wail']) assert.ok(statSync(file(RIGS.crone.clips[c].src)).size <= 200 * 1024, c);
  assert.ok(statSync(file('./assets/snow/fox.glb')).size <= 5 * MB);
});

test('the fox skins to full weight on twenty bones, and its tails stay tail', async () => {
  const THREE = await import('../dist/vendor/three.module.js');
  const { createWolfCharacter, FOX_SHAPE } = await import('../dist/wolf-character3d.js');
  const { SKINS } = await import('../dist/characters3d.js');
  assert.equal(FOX_SHAPE.asset, './assets/snow/fox.glb'); assert.equal(FOX_SHAPE.yaw, Math.PI); assert.ok(SKINS.includes('fox'));
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(.54, FOX_SHAPE.height, 1.68, 8, 12, 24), new THREE.MeshStandardMaterial()));
  const model = createWolfCharacter({ scene }, FOX_SHAPE), g = model.meshes[0].geometry, pos = g.attributes.position, idx = g.attributes.skinIndex, wt = g.attributes.skinWeight, p = new THREE.Vector3();
  assert.equal(model.skeleton.bones.length, 20);
  let tails = 0;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); let sum = 0; const names = [];
    for (let j = 0; j < 4; j++) { const w = wt.getComponent(i, j); sum += w; if (w > 0) names.push(model.skeleton.bones[idx.getComponent(i, j)].name); }
    assert.ok(Math.abs(sum - 1) < 1e-5);
    if (p.z < -.5 && p.y > .35) { tails++; assert.ok(names.every(n => n.startsWith('Tail')), names.join()); }
  }
  assert.ok(tails > 0);
});
