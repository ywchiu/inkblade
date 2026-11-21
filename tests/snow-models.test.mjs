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

test('the mountain asks for exactly the bodies it loads today', async () => {
  const { REALM_SKINS } = await import('../dist/characters3d.js');
  assert.deepEqual(REALM_SKINS.mountain, ['beast', 'scribe']);
  assert.deepEqual(REALM_SKINS.snow, ['fox', 'traveller', 'howler', 'crone']);
});

test('every realm body is a skin the loader knows', async () => {
  const { REALM_SKINS, SKINS } = await import('../dist/characters3d.js');
  for (const name of Object.values(REALM_SKINS).flat()) assert.ok(SKINS.includes(name), name);
});

test('asking again does not load again', async () => {
  const { SkinShelf } = await import('../dist/characters3d.js');
  let n = 0; const shelf = new SkinShelf(async name => (n++, { name }));
  await shelf.want(['fox']); await shelf.want(['fox', 'fox']);
  assert.equal(n, 1); assert.equal(shelf.get('fox').name, 'fox'); assert.equal(shelf.get('crone'), null);
});

test('a body that fails to load is null and asked for once', async () => {
  const { SkinShelf } = await import('../dist/characters3d.js');
  let n = 0; const shelf = new SkinShelf(async () => { n++; return null; });
  await shelf.want(['crone']); await shelf.want(['crone']);
  assert.equal(shelf.get('crone'), null); assert.equal(n, 1);
  const throwing = new SkinShelf(async () => { throw new Error('404'); });
  await assert.doesNotReject(throwing.want(['howler'])); assert.equal(throwing.get('howler'), null);
});

test('nothing is fetched until a realm asks, and a run asks for its own realm', async () => {
  const { readFileSync } = await import('node:fs');
  const world = readFileSync(new URL('../dist/world3d.js', import.meta.url), 'utf8'), game = readFileSync(new URL('../dist/game3d.js', import.meta.url), 'utf8'), field = readFileSync(new URL('../dist/campaign-world3d.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /for\(const name of SKINS\)/);
  assert.match(world, /prepareRealm\(id\)\{/);
  assert.match(game, /world\.prepareRealm\(game\.realm\.id\)/);
  assert.match(field, /world\.shelf\?\.get\(skin\)/);
});
