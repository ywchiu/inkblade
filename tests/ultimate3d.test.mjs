import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { ArenaCombat } from '../dist/combat3d.js';
import { CampaignCombat } from '../dist/campaign3d.js';
import { CombatVFX } from '../dist/combat-vfx.js';

// The blade glow paints a small canvas texture; a stand-in is enough outside the browser.
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }) }) };
const { UltimateFX, closeUp, arcGeometry, SECOND_SHOT } = await import('../dist/ultimate3d.js');

function stage(game) {
  const scene = new THREE.Scene(), head = new THREE.Object3D(), weapon = new THREE.Object3D(), root = new THREE.Group();
  head.position.set(0, 1.7, 0); weapon.position.set(.3, 1.1, .2); root.add(head, weapon); scene.add(root);
  const camera = new THREE.PerspectiveCamera(48, 16 / 9, .1, 100); camera.position.set(game.player.x + 1, 3, game.player.z + 6);
  const world = { camera, player: { head, weapon, root }, combatVFX: new CombatVFX(scene), shake: 0 };
  const place = () => { root.position.set(game.player.x, 0, game.player.z); root.updateMatrixWorld(true); };
  return { scene, world, fx: new UltimateFX(scene), place };
}
function close(g) { g.player.x = 0; g.player.z = 2; g.player.yaw = Math.PI; g.enemy.x = 0; g.enemy.z = 0; g.enemy.state = 'recover'; g.enemy.timer = 10; }

test('the gathering is two shots: the face off one shoulder, then low on the other side looking up the blade', () => {
  const hero = { x: 2, z: -3, yaw: .7 }, head = new THREE.Vector3(2, 1.7, -3), front = new THREE.Vector3(Math.sin(.7), 0, Math.cos(.7)), right = new THREE.Vector3(Math.cos(.7), 0, -Math.sin(.7));
  const reach = shot => shot.position.clone().sub(head).setY(0);
  for (const side of [1, -1]) {
    const far = closeUp(hero, head, 0, side), near = closeUp(hero, head, SECOND_SHOT - .01, side);
    assert.ok(reach(far).dot(front) > 0 && reach(near).dot(front) > 0, 'camera faces the hero');
    assert.ok(reach(near).length() < reach(far).length() && reach(near).length() > 1.4, 'pushes in without clipping into the face');
    assert.ok(far.position.y < head.y && near.fov < far.fov);
    assert.ok(near.look.distanceTo(head) < .35, 'the face stays in frame');
    const low = closeUp(hero, head, SECOND_SHOT, side), last = closeUp(hero, head, 1, side);
    assert.ok(reach(low).dot(right) * reach(near).dot(right) < 0, 'the second shot crosses to the other shoulder');
    assert.ok(reach(low).dot(front) > 0 && low.position.y < .6 && low.look.y > head.y + .2, 'near the ground, looking up past the head');
    assert.ok(reach(low).length() > reach(far).length() && low.fov > far.fov, 'wide enough for the whole figure and the raised blade');
    assert.ok(reach(last).length() < reach(low).length(), 'still drifting in');
  }
  assert.ok(closeUp(hero, head, 0, 1).position.distanceTo(closeUp(hero, head, 0, -1).position) > 2, 'the two shoulders are different shots');
  assert.ok(closeUp(hero, head, .3, 1, true).fov > closeUp(hero, head, .3, 1).fov && closeUp(hero, head, .8, 1, true).fov > closeUp(hero, head, .8, 1).fov, 'portrait screens get a wider lens');
});

test('stroke bands run along a circle: a slash passes through its target, a ring circles it', () => {
  const box = g => { g.computeBoundingBox(); return g.boundingBox; };
  const slash = box(arcGeometry(2.5, .6, 1.3)), ring = box(arcGeometry(2.3, 1, Math.PI * 1.7, { centred: true }));
  assert.ok(slash.max.y > .25 && slash.max.y < .35 && Math.abs(slash.min.x + slash.max.x) < 1e-6, 'slash midpoint on the origin');
  assert.ok(ring.max.x > 2.7 && ring.min.x < -2.7 && ring.max.y > 2.7, 'ring keeps its radius around the origin');
});

test('the ultimate cuts to a close-up, releases once, marks every hit and lets go when it ends', () => {
  const g = new ArenaCombat(2); close(g); const { fx, world, place } = stage(g); place();
  assert.equal(fx.update(1 / 60, g, world), null); assert.equal(fx.snapshot().active, false);
  g.player.qi = 100; g.action('special');
  const shots = []; let cuts = 0, peakSlashes = 0, peakDark = 0, sawFinal = false, sawPull = 0;
  for (let i = 0; i < 200; i++) {
    g.update(1 / 60); place(); const u = g.ultimate(), shot = fx.update(1 / 60, g, world), s = fx.snapshot();
    if (shot?.cut) cuts++;
    if (u?.charging) { shots.push(shot); assert.ok(shot.position && shot.look && shot.fov < 50, 'charging frames place the camera'); }
    else if (u) assert.equal(shot?.position, undefined, 'the camera is handed back at the release');
    peakSlashes = Math.max(peakSlashes, s.slashes); peakDark = Math.max(peakDark, s.dark); sawPull = Math.max(sawPull, fx.pull);
    if (s.pillars && s.spikes) sawFinal = true;
  }
  assert.ok(shots.length > 45, 'the close-up lasts the whole gathering');
  assert.equal(cuts, 2, 'one cut in, one cut out');
  assert.ok(shots[5].position.distanceTo(shots[0].position) > .02 && shots[5].fov < shots[0].fov, 'the camera drifts in');
  assert.ok(shots.at(-1).position.y < .6 && shots[0].position.y > 1 && shots.at(-1).fov > shots[0].fov, 'and cuts to the low shot before the release');
  assert.ok(peakDark > .85 && peakSlashes >= 1 && sawFinal && sawPull > .8);
  const end = fx.snapshot(); assert.equal(g.player.state, 'idle'); assert.equal(end.active, false); assert.equal(end.fired, 5); assert.equal(end.casts, 1);
  for (let i = 0; i < 120; i++) fx.update(1 / 60, g, world);
  const settled = fx.snapshot(); assert.ok(settled.dark < .01 && settled.glow < .01 && settled.flash === 0 && fx.pull < .01);
  assert.equal(settled.slashes + settled.waves + settled.pillars + settled.spikes, 0, 'nothing is left in the air');
  assert.equal(fx.bladeLight.intensity < .3 && fx.keyLight.intensity < .01, true);
});

test('pausing holds the cast, a restart clears it, and a miss still paints the cuts', () => {
  const g = new ArenaCombat(2); g.player.z = 9; g.enemy.z = -9; g.enemy.state = 'recover'; g.enemy.timer = 100; const { fx, world, place } = stage(g); place();
  g.player.qi = 100; g.action('special');
  for (let i = 0; i < 30; i++) { g.update(1 / 60); fx.update(1 / 60, g, world); }
  const before = fx.snapshot(); fx.update(0, g, world); assert.deepEqual(fx.snapshot(), before, 'a paused frame changes nothing');
  let slashes = 0; for (let i = 0; i < 80; i++) { g.update(1 / 60); fx.update(1 / 60, g, world); slashes = Math.max(slashes, fx.snapshot().slashes); }
  assert.ok(slashes >= 1, 'cuts are drawn ahead of the hero when nothing is in reach');
  fx.clear(); const cleared = fx.snapshot(); assert.equal(cleared.active, false); assert.equal(cleared.dark + cleared.lines + cleared.glow + cleared.flash + cleared.slashes + cleared.waves + cleared.pillars + cleared.spikes, 0);
});

test('a crowd is cut together: every troop in reach takes the flurry and the closing hit', () => {
  const g = new CampaignCombat(); const p = g.player; g.deploy({ x: 0, z: 314, units: ['wolf', 'wolf', 'wolf'], index: 0 }); g.drainEvents();
  g.enemies.forEach((e, i) => { const a = i / g.enemies.length * Math.PI * 2; e.x = p.x + Math.sin(a) * 3; e.z = p.z + Math.cos(a) * 3; e.state = 'recover'; e.timer = 100; e.hp = e.maxHp = 500; });
  const { fx, world, place } = stage(g); place(); p.qi = 100; g.action('special');
  let slashes = 0, pillars = 0; const hits = new Map();
  for (let i = 0; i < 220; i++) { g.update(1 / 60); for (const e of g.drainEvents()) if (['hit', 'special-hit'].includes(e.type)) hits.set(e.enemyId, (hits.get(e.enemyId) || 0) + 1); fx.update(1 / 60, g, world); const s = fx.snapshot(); slashes = Math.max(slashes, s.slashes); pillars = Math.max(pillars, s.pillars); }
  assert.equal(hits.size, 6); for (const n of hits.values()) assert.equal(n, 5);
  for (const e of g.enemies) assert.equal(e.hp, 425);
  assert.ok(slashes >= 6 && pillars >= 6, `slashes ${slashes}, pillars ${pillars}`);
});
