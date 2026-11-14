import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import { GLTFLoader } from '../dist/vendor/addons/loaders/GLTFLoader.js';
import { HERO_RIG, RONIN_RIG, clipCandidates, pickClip, scrubTime } from '../dist/rig-clips.js';
import { createRiggedCharacter, prepareClip, animateRigged } from '../dist/rigged-character3d.js';

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 4, height: 4, close() {} });
const full = Object.fromEntries(['idle', 'walk', 'run', 'sprint', 'light1', 'light2', 'light3', 'heavy', 'spin', 'rising', 'dodge', 'guard', 'hurt', 'death'].map(n => [n, { speed: n === 'walk' ? 1.4 : n === 'run' ? 3.2 : undefined }]));
const actor = extra => ({ x: 0, z: 0, yaw: 0, speed: 0, state: 'idle', timer: 0, total: 0, ...extra });

test('locomotion picks a clip by speed and scales playback to keep feet in pace', () => {
  assert.equal(pickClip(actor(), full).name, 'idle');
  const walk = pickClip(actor({ speed: 1.4 }), full); assert.deepEqual([walk.name, walk.mode, walk.rate], ['walk', 'loop', 1]);
  const run = pickClip(actor({ speed: 2.4 }), full); assert.equal(run.name, 'run'); assert.ok(Math.abs(run.rate - .75) < 1e-9);
  assert.equal(pickClip(actor({ speed: 5 }), full).name, 'sprint');
  assert.equal(pickClip(actor({ speed: 30 }), full).rate, 1);
});

test('a move sequence strings clips together and pins a contact frame to the move time', () => {
  const steps = { spin: [{ to: .9, clip: 'guard', range: [.1, .9] }, { to: 1.5, clip: 'heavy', range: [.4, 1.2] }, { clip: 'light2', range: [.7, 1.5], hit: 1.05, at: 1.7 }] };
  const at = age => { const pick = pickClip(actor({ state: 'special', move: 'spin', total: 2.2, timer: 2.2 - age }), full, {}, steps); return [pick.name, +scrubTime({}, 3, pick).toFixed(3)]; };
  assert.deepEqual(at(0), ['guard', .1]); assert.deepEqual(at(.45), ['guard', .5]); assert.deepEqual(at(1.2), ['heavy', .8]);
  assert.deepEqual(at(1.5), ['light2', .7]); assert.deepEqual(at(1.7), ['light2', 1.05]); assert.deepEqual(at(2.2), ['light2', 1.5]);
  // Without every clip of the sequence the move falls back to its single clip.
  assert.equal(pickClip(actor({ state: 'special', move: 'spin', total: 2.2, timer: 1 }), { idle: {}, spin: {} }, {}, steps).name, 'spin');
  for (const step of HERO_RIG.sequences.spin) assert.ok(HERO_RIG.clips[step.clip], step.clip + ' exists in the hero rig');
});

test('attacks follow the combo chain and are scrubbed by the combat timer', () => {
  assert.deepEqual([1, 2, 3, 4].map(chain => pickClip(actor({ state: 'light', chain, timer: .3, total: .4 }), full).name), ['light1', 'light2', 'light3', 'light1']);
  const heavy = pickClip(actor({ state: 'heavy', timer: .25, total: 1 }), full); assert.deepEqual([heavy.name, heavy.mode, heavy.progress], ['heavy', 'scrub', .75]);
  assert.deepEqual(clipCandidates(actor({ state: 'special', move: 'rising' })), ['rising', 'spin']);
  assert.deepEqual(['diagonal', 'reverse', 'cleave'].map(move => pickClip(actor({ state: 'light', move, timer: .1, total: .4 }), full).name), ['light1', 'light2', 'light3']);
  assert.equal(pickClip(actor({ state: 'roll', timer: .2, total: .4 }), full).mode, 'scrub');
  assert.equal(pickClip(actor({ state: 'dead' }), full).mode, 'once');
});

test('enemy attacks pick a clip by variant and land the hit between windup and attack', () => {
  const clips = { idle: {}, slashRight: { range: [.2, 1.2], hit: .8 }, thrust: {} }, moves = RONIN_RIG.moves;
  const wind = pickClip(actor({ state: 'windup', kind: 'slash', variant: 'slash-right', timer: .25, total: .5 }), clips, moves);
  assert.deepEqual([wind.name, wind.mode, wind.segment], ['slashRight', 'scrub', 'windup']); assert.ok(Math.abs(scrubTime(clips.slashRight, 2, wind) - .5) < 1e-9);
  const hit = pickClip(actor({ state: 'attack', kind: 'slash', variant: 'slash-right', timer: .4, total: .4 }), clips, moves);
  assert.equal(scrubTime(clips.slashRight, 2, hit), .8); assert.equal(scrubTime(clips.slashRight, 2, { ...hit, progress: 1 }), 1.2);
  assert.equal(pickClip(actor({ state: 'windup', kind: 'thrust' }), clips, moves).name, 'thrust');
  assert.equal(pickClip(actor({ state: 'windup', kind: 'slam', variant: 'slam' }), clips, moves).name, 'idle');
  assert.equal(scrubTime({}, 2, { progress: .5, segment: 'windup' }), .5);
});

test('a state with no authored clip falls back and is reported as inexact', () => {
  const only = { idle: {}, run: { speed: 3.2 } };
  const attack = pickClip(actor({ state: 'heavy', timer: .5, total: 1 }), only); assert.deepEqual([attack.name, attack.mode, attack.exact], ['idle', 'loop', false]);
  const walk = pickClip(actor({ speed: 1 }), only); assert.deepEqual([walk.name, walk.exact], ['run', false]); assert.equal(walk.rate, .6);
  assert.equal(pickClip(actor(), {}), null);
});

test('root motion: pinned for in-place clips, relative to the first frame otherwise; scale tracks dropped', () => {
  const clip = new THREE.AnimationClip('x', 1, [new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [1, 2, 3, 9, 5, 9]), new THREE.VectorKeyframeTrack('Hips.scale', [0, 1], [1, 1, 1, 1, 1, 1]), new THREE.QuaternionKeyframeTrack('Spine.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])]);
  const pinned = prepareClip(clip, 'walk', { inPlace: true }), free = prepareClip(clip, 'death');
  assert.equal(pinned.name, 'walk'); assert.deepEqual(pinned.tracks.map(t => t.name), ['Hips.position', 'Spine.quaternion']);
  assert.deepEqual([...pinned.tracks[0].values], [0, 2, 0, 0, 5, 0]); assert.deepEqual([...free.tracks[0].values], [0, 2, 0, 8, 5, 6]); assert.deepEqual([...clip.tracks[0].values], [1, 2, 3, 9, 5, 9]);
});

test('current hero rig loads, fits the game height and animates without NaN', async () => {
  const parse = async path => { const bytes = await readFile(new URL('../dist/' + path.slice(2), import.meta.url)); return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); };
  const gltf = await parse(HERO_RIG.rig), clips = {};
  for (const [name, c] of Object.entries(HERO_RIG.clips)) clips[name] = prepareClip((await parse(c.src)).animations[0], name, { inPlace: !!c.speed });
  const m = createRiggedCharacter(gltf, HERO_RIG, clips, { createWeapon: () => new THREE.Group() });
  assert.equal(m.skeleton.bones.length, 24); assert.ok(m.weapon && m.arms[0].hand && m.legs[1].foot && m.head);
  const box = new THREE.Box3().setFromObject(m.scene); assert.ok(Math.abs(box.max.y - box.min.y - HERO_RIG.height) < .02); assert.ok(Math.abs(box.min.y) < .02);
  const size = m.weapon.getWorldScale(new THREE.Vector3()); assert.ok(Math.abs(size.x - 1) < 1e-3 && Math.abs(size.y - 1) < 1e-3);
  const a = actor({ speed: 3.2 }); let t = 0;
  for (let i = 0; i < 20; i++) { t += 1 / 30; a.x += .1; animateRigged(m, a, t, 1 / 30); }
  assert.equal(m.current.name, 'run'); assert.equal(m.root.position.x, a.x);
  assert.ok(Math.abs(m.body.rotation.y - Math.PI / 2) < .02, 'running sideways turns the body into the direction of travel');
  Object.assign(a, { state: 'heavy', speed: 0, timer: .5, total: 1 }); animateRigged(m, a, t += 1 / 30, 1 / 30);
  assert.equal(m.current.name, 'heavy'); for (let i = 0; i < 20; i++) animateRigged(m, a, t += 1 / 30, 1 / 30); assert.ok(Math.abs(m.body.rotation.y) < .01, 'attacks face the target again');
  Object.assign(a, { state: 'light', chain: 1, timer: .2, total: .4 }); animateRigged(m, a, t += 1 / 30, 1 / 30);
  const [from, to] = HERO_RIG.clips.light1.range || [0, m.actions.light1.getClip().duration];
  assert.equal(m.current.name, 'light1'); assert.ok(Math.abs(m.actions.light1.time - (from + to) / 2) < 1e-6);
  m.root.updateMatrixWorld(true);
  for (const b of m.skeleton.bones) assert.ok(b.matrixWorld.elements.every(Number.isFinite), b.name);
  // A campaign foe is a clone: three.js copies userData through JSON, so the sword's rest pose arrives as a plain array.
  m.weaponRest = undefined; m.weapon.userData = JSON.parse(JSON.stringify(m.weapon.userData)); animateRigged(m, a, t += 1 / 30, 1 / 30); m.root.updateMatrixWorld(true);
  assert.ok(m.weapon.matrixWorld.elements.every(Number.isFinite), 'a cloned fighter keeps its sword');
});
