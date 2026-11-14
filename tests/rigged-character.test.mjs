import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import { GLTFLoader } from '../dist/vendor/addons/loaders/GLTFLoader.js';
import { HERO_RIG, RONIN_RIG, clipCandidates, pickClip, scrubTime, guardStep } from '../dist/rig-clips.js';
import { footStep, mixStanceWalk } from '../dist/stance-walk.js';
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
  for (const [name, c] of Object.entries(HERO_RIG.clips)) if (c.src) clips[name] = prepareClip((await parse(c.src)).animations[0], name, { inPlace: !!c.speed });
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

test('guarded steps follow the direction of travel', () => {
  assert.deepEqual(guardStep(0), { name: 'guardwalk', reverse: false }); assert.deepEqual(guardStep(Math.PI), { name: 'guardwalk', reverse: true }); assert.deepEqual(guardStep(-Math.PI * .95), { name: 'guardwalk', reverse: true });
  assert.deepEqual(guardStep(Math.PI / 2), { name: 'guardstrafe', reverse: false }); assert.deepEqual(guardStep(-Math.PI / 2), { name: 'guardstrafe', reverse: true }); assert.deepEqual(guardStep(Math.PI * 2.5), { name: 'guardstrafe', reverse: false });
  const guarding = actor({ state: 'guard', speed: 1.45 }), clips = { idle: {}, guard: {}, guardwalk: { speed: 1.45 }, guardstrafe: { speed: 1.45 } };
  assert.deepEqual(clipCandidates(guarding, {}, Math.PI / 2), ['guardstrafe', 'guardwalk', 'guard']); assert.deepEqual(clipCandidates(guarding), ['guardwalk', 'guard']); assert.deepEqual(clipCandidates(actor({ state: 'guard' }), {}, 2), ['guard']);
  assert.deepEqual(pickClip(guarding, clips), { name: 'guardwalk', mode: 'loop', rate: 1, exact: true });
  assert.equal(pickClip(guarding, clips, {}, {}, Math.PI).rate, -1, 'backing off plays the walk backwards'); assert.deepEqual(pickClip(guarding, clips, {}, {}, -Math.PI / 2), { name: 'guardstrafe', mode: 'loop', rate: -1, exact: true });
  // A rig with only the forward steps still steps sideways with them, and never backwards for a sidestep.
  assert.deepEqual(pickClip(guarding, { idle: {}, guard: {}, guardwalk: { speed: 1.45 } }, {}, {}, -Math.PI / 2), { name: 'guardwalk', mode: 'loop', rate: 1, exact: false });
  assert.equal(pickClip(guarding, { idle: {}, guard: {} }, {}, {}, Math.PI).rate, 1);
});

test('a step lands ahead, stays down for its share of the cycle and lifts on the way back', () => {
  const land = footStep(0, .6), leave = footStep(.6 - 1e-9, .6), mid = footStep(.8, .6), wrap = footStep(1 - 1e-9, .6);
  assert.ok(land.planted && Math.abs(land.along - .5) < 1e-9 && land.up === 0); assert.ok(leave.planted && Math.abs(leave.along + .5) < 1e-6 && leave.heel > .99);
  assert.ok(!mid.planted && mid.up > .9 && Math.abs(mid.along) < .2); assert.ok(Math.abs(wrap.along - .5) < 1e-6 && wrap.up < 1e-6 && Math.abs(wrap.heel - land.heel) < 1e-6, 'the cycle closes');
  // On the ground the foot goes back at one steady pace: that is what keeps it from sliding.
  const pace = (a, b) => (footStep(a, .6).along - footStep(b, .6).along) / (b - a); assert.ok(Math.abs(pace(.1, .2) - pace(.4, .5)) < 1e-9);
  assert.deepEqual(footStep(1.25, .6), footStep(.25, .6));
});

test('the hero walks behind the guard: feet planted, sword held, every direction', async () => {
  const parse = async path => { const bytes = await readFile(new URL('../dist/' + path.slice(2), import.meta.url)); return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); };
  const gltf = await parse(HERO_RIG.rig), clips = {};
  for (const name of ['idle', 'guard', 'run']) clips[name] = prepareClip((await parse(HERO_RIG.clips[name].src)).animations[0], name, { inPlace: !!HERO_RIG.clips[name].speed });
  const m = createRiggedCharacter(gltf, HERO_RIG, clips, { createWeapon: () => new THREE.Group() });
  assert.ok(m.clips.guardwalk && m.clips.guardstrafe, 'the steps are made when the rig loads'); assert.equal(m.clipInfo.guardwalk.speed, 1.45);
  assert.ok(m.clips.guardwalk.duration > .6 && m.clips.guardwalk.duration < 1.1, 'a walking cadence, not a shuffle');
  const balls = m.legs.map(leg => leg.foot.children.find(c => c.isBone)), dt = 1 / 60, pace = 1.45;
  const held = () => { const a = actor({ state: 'guard' }); for (let i = 0; i < 30; i++) animateRigged(m, a, i * dt, dt); m.root.updateMatrixWorld(true); return m.arms[0].hand.getWorldPosition(new THREE.Vector3()); };
  const standing = held(); let t = 10;
  for (const [label, dx, dz, name, rate] of [['ahead', 0, 1, 'guardwalk', 1], ['back', 0, -1, 'guardwalk', -1], ['left', 1, 0, 'guardstrafe', 1], ['right', -1, 0, 'guardstrafe', -1]]) {
    const a = actor({ state: 'guard', speed: pace }), paths = balls.map(() => []); let hand = null;
    for (let i = 0; i < 200; i++) { a.x += dx * pace * dt; a.z += dz * pace * dt; animateRigged(m, a, t += dt, dt); m.root.updateMatrixWorld(true); if (i >= 40) balls.forEach((b, k) => paths[k].push(b.getWorldPosition(new THREE.Vector3()))); if (i === 199) hand = m.arms[0].hand.getWorldPosition(new THREE.Vector3()); }
    assert.equal(m.current.name, name, label); assert.equal(m.actions[name].timeScale, rate, label); assert.equal(m.body.rotation.y, 0, label + ': the body keeps facing the target');
    for (const path of paths) {
      const floor = Math.min(...path.map(p => p.y)), top = Math.max(...path.map(p => p.y)), slide = [];
      for (let i = 1; i < path.length; i++) if (path[i].y < floor + .01 && path[i - 1].y < floor + .01) slide.push(Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z) / dt);
      const mean = slide.reduce((sum, v) => sum + v, 0) / slide.length, share = slide.length / path.length;
      assert.ok(top - floor > .05, label + ': the foot lifts'); assert.ok(share > .45 && share < .75, label + ': each foot is down a little over half the time, got ' + share.toFixed(2));
      assert.ok(mean < pace * .1, label + ': a planted foot stays where it landed, slid at ' + mean.toFixed(3) + ' m/s');
    }
    assert.ok(Math.abs(hand.y - standing.y) < .12 && Math.hypot(hand.x - a.x - standing.x, hand.z - a.z - standing.z) < .12, label + ': the sword hand holds the guard');
  }
});

test('behind the guard the hero walks on the bought steps and keeps the sword where the guard holds it', async () => {
  const parse = async path => { const bytes = await readFile(new URL('../dist/' + path.slice(2), import.meta.url)); return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); };
  const gltf = await parse(HERO_RIG.rig), clips = {};
  for (const name of ['idle', 'guard', 'fightwalk']) clips[name] = prepareClip((await parse(HERO_RIG.clips[name].src)).animations[0], name, { inPlace: !!HERO_RIG.clips[name].speed });
  const m = createRiggedCharacter(gltf, HERO_RIG, clips, { createWeapon: () => new THREE.Group() }), walk = m.clips.guardwalk, steps = m.clips.fightwalk;
  assert.equal(walk.duration, steps.duration, 'the legs come from the authored walk'); assert.equal(m.clipInfo.guardwalk.speed, HERO_RIG.clips.fightwalk.speed, 'and so does the pace'); assert.deepEqual(m.clipInfo.guardwalk.rates, HERO_RIG.clips.fightwalk.rates);
  const track = (clip, name) => clip.tracks.find(t => t.name === name);
  assert.deepEqual([...track(walk, 'LeftLeg.quaternion').values], [...track(steps, 'LeftLeg.quaternion').values]); assert.equal(track(walk, 'RightArm.quaternion').times.length, 2, 'the arms hold one pose');
  const scale = m.hips.parent.getWorldScale(new THREE.Vector3()).y, drop = HERO_RIG.clips.guardwalk.walk.drop;
  assert.ok(Math.abs((track(steps, 'Hips.position').values[1] - track(walk, 'Hips.position').values[1]) * scale - drop) < 1e-4, 'the body is set down onto the ground');
  // Standing guard, then walking: the head and sword hand stay put over the feet while the hips turn under them.
  const pose = () => { m.root.updateMatrixWorld(true); return { head: m.head.getWorldPosition(new THREE.Vector3()), hand: m.arms[0].hand.getWorldPosition(new THREE.Vector3()), hips: m.hips.getWorldQuaternion(new THREE.Quaternion()), chest: m.head.parent.getWorldQuaternion(new THREE.Quaternion()) }; };
  const dt = 1 / 60, still = actor({ state: 'guard' }); let t = 0; for (let i = 0; i < 40; i++) animateRigged(m, still, t += dt, dt);
  const standing = pose(), a = actor({ state: 'guard', speed: 1.45 }), balls = m.legs.map(leg => leg.foot.children.find(c => c.isBone)), heights = balls.map(() => []); let turned = 0, leaned = 0, strayed = 0;
  for (let i = 0; i < 200; i++) {
    a.z += 1.45 * dt; animateRigged(m, a, t += dt, dt); if (i < 40) continue;
    const now = pose(); turned = Math.max(turned, standing.hips.angleTo(now.hips)); leaned = Math.max(leaned, standing.chest.angleTo(now.chest));
    strayed = Math.max(strayed, Math.hypot(now.head.x - standing.head.x, now.head.y - standing.head.y, now.head.z - a.z - standing.head.z), Math.hypot(now.hand.x - standing.hand.x, now.hand.y - standing.hand.y, now.hand.z - a.z - standing.hand.z));
    balls.forEach((b, k) => heights[k].push(b.getWorldPosition(new THREE.Vector3()).y));
  }
  assert.equal(m.current.name, 'guardwalk'); assert.ok(Math.abs(m.actions.guardwalk.timeScale - 1.45 / HERO_RIG.clips.fightwalk.speed) < 1e-9, 'played at the pace that matches the ground');
  assert.ok(turned > .5, 'the walk turns the hips square to the road'); assert.ok(leaned < .2, 'the chest keeps the guard, off by ' + leaned.toFixed(2) + ' rad'); assert.ok(strayed < .12, 'head and sword hand stay over the feet, strayed ' + strayed.toFixed(3) + ' m');
  for (const ys of heights) assert.ok(Math.max(...ys) - Math.min(...ys) > .12, 'each foot lifts clear of the ground');
  a.z -= 1.45 * dt; for (let i = 0; i < 30; i++) { a.z -= 1.45 * dt; animateRigged(m, a, t += dt, dt); } assert.ok(m.actions.guardwalk.timeScale < -1.5, 'backing off runs the same steps backwards');
  // Without a spine to counter the hips there is nothing to hold the stance with.
  assert.equal(mixStanceWalk({ ...m, hips: null }, m.clips.guard, steps), null);
});
