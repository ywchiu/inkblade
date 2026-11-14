import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import { GLTFLoader } from '../dist/vendor/addons/loaders/GLTFLoader.js';
import { ArenaCombat, SPRINT_ATTACK, withinArc } from '../dist/combat3d.js';
import { CampaignCombat } from '../dist/campaign3d.js';
import { PLAYER_MOVES, LIGHT_CHAIN, attackTravel } from '../dist/attack-moves.js';
import { SimpleAttack, HEAVY_HOLD, attackLabel, comboHint } from '../dist/simple-controls.js';
import { cueFor } from '../dist/audio3d.js';
import { HERO_RIG, pickClip, scrubTime } from '../dist/rig-clips.js';

globalThis.self ??= globalThis;
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, clearRect() {}, fillText() {} }) }) };
const { HeroArts } = await import('../dist/hero-arts3d.js');

const STEP = 1 / 120;
const run = (g, seconds, input = {}) => { for (let i = 0; i < Math.round(seconds / STEP); i++) g.update(STEP, input); };
const settle = (g, input = {}) => { for (let i = 0; i < 400 && !['idle', 'guard'].includes(g.player.state); i++) g.update(STEP, input); assert.ok(['idle', 'guard'].includes(g.player.state)); };
const types = g => g.drainEvents().map(e => e.type);

// The duel with several foes: the same three hooks the campaign overrides, so a strike fans out.
class Crowd extends ArenaCombat {
  constructor(spots) {
    super(2); const p = this.player; p.x = 0; p.z = 0; p.yaw = 0;
    this.enemies = spots.map(([x, z], i) => ({ ...this.enemy, id: i + 1, x, z, state: 'recover', timer: 1000, hp: 1000, maxHp: 1000, posture: 0, maxPosture: 1000 }));
    this.enemy = this.enemies[0];
  }
  targets() { return this.enemies || [this.enemy]; }
  withEnemy(e, fn) { const old = this.enemy; this.enemy = e; try { return fn(); } finally { this.enemy = old; } }
  updateEnemies() {}
  resolveBodies() {}
  constrain() {}
  strike(move, special) { let n = 0; for (const e of this.enemies) if (e.hp > 0 && withinArc(this.player, e, move.range + e.radius * .3, move.arc)) { this.withEnemy(e, () => this.hitEnemy(move.damage, move.posture, this.strikeKind(move, special))); n++; } if (!n) this.emit('miss'); }
  lost() { return this.enemies.map(e => 1000 - e.hp); }
}
const far = () => { const g = new ArenaCombat(2); g.player.x = 0; g.player.z = 8; g.player.yaw = Math.PI; g.enemy.x = 0; g.enemy.z = -8; g.enemy.state = 'recover'; g.enemy.timer = 1000; return g; };
const guarding = g => { g.update(STEP, { guard: true }); assert.equal(g.player.state, 'guard'); };

test('the light chain runs five cuts, then starts over; each costs the same stamina', () => {
  assert.deepEqual(LIGHT_CHAIN, ['diagonal', 'reverse', 'cleave', 'twin', 'crash']);
  const g = far(), seen = [];
  for (let i = 0; i < 6; i++) { g.player.stamina = 100; assert.ok(g.action('light')); seen.push(g.player.move); assert.equal(g.player.stamina, 84); settle(g); }
  assert.deepEqual(seen, [...LIGHT_CHAIN, 'diagonal']);
  // Letting the window lapse starts over from the first cut.
  g.action('light'); settle(g); run(g, 1.4); g.player.stamina = 100; g.action('light'); assert.equal(g.player.move, 'diagonal');
  for (const id of ['twin', 'crash', 'leap', 'inkWave', 'seal']) assert.ok(PLAYER_MOVES[id].name && PLAYER_MOVES[id].frames.length > 3, id);
});

test('雙燕迴翔 cuts twice, each cut once per foe in its arc', () => {
  const g = new Crowd([[0, 2], [.9, 1.9], [0, -2]]); g.player.chain = 3; g.player.chainWindow = 1; g.action('light'); assert.equal(g.player.move, 'twin');
  run(g, .3); assert.deepEqual(g.lost(), [11, 11, 0]); settle(g); assert.deepEqual(g.lost(), [24, 24, 0]); assert.equal(g.stats.hits, 4);
});

test('崩山斷 lands the overhead on what is in front and a shock on everything close around', () => {
  const g = new Crowd([[0, 2], [0, -2], [-2.2, 0], [0, -4]]); g.player.chain = 4; g.player.chainWindow = 1; g.action('light'); assert.equal(g.player.move, 'crash');
  run(g, .37); assert.deepEqual(g.lost(), [28, 0, 0, 0]); assert.ok(!types(g).includes('art'));
  settle(g); assert.deepEqual(g.lost(), [38, 10, 10, 0]);
  const shock = g.drainEvents().filter(e => e.type === 'art'); assert.equal(shock.length, 1); assert.deepEqual([shock[0].art, shock[0].radius], ['crash', 2.6]);
  assert.equal(g.stats.hits, 4);
});

test('躍淵斬 needs a real sprint, follows the run, covers about four metres and hits all around where it lands', () => {
  const g = far(); g.enemy.x = 30; const input = { x: 1, z: 0, sprint: true };
  run(g, SPRINT_ATTACK - .05, input); assert.equal(g.canLeap(), false); g.action('light', 1, 0); assert.equal(g.player.move, 'diagonal', 'a step is not a sprint'); settle(g);
  g.player.stamina = 100; run(g, SPRINT_ATTACK + .05, input); assert.ok(g.canLeap()); assert.equal(attackLabel(g), '躍斬'); assert.match(comboHint(g), /躍淵斬/);
  const before = g.player.stamina, x = g.player.x, z = g.player.z; assert.ok(g.action('light', 1, 0)); assert.equal(g.player.move, 'leap'); assert.equal(g.player.stamina, before - 24);
  assert.ok(Math.abs(g.player.yaw - Math.PI / 2) < 1e-9, 'the leap goes where the hero was running, not at a foe behind');
  settle(g); assert.ok(Math.abs(g.player.x - x - 4) < .05, `leapt ${g.player.x - x}`); assert.ok(Math.abs(g.player.z - z) < 1e-6); assert.equal(g.canLeap(), false);
  // Too tired for it: nothing happens and nothing is spent.
  const tired = far(); tired.player.sprintTime = 1; tired.player.stamina = 20; assert.equal(tired.action('light'), false); assert.equal(tired.player.stamina, 20);
  // Landing in a pack: everyone within the shock is hit once, a foe further out is not.
  const c = new Crowd([[0, 5.2], [1.6, 4], [-1.4, 3.2], [0, 9]]); c.player.sprintTime = 1; c.action('light', 0, 1); assert.equal(c.player.move, 'leap');
  run(c, .45); assert.deepEqual(c.lost(), [0, 0, 0, 0]); settle(c); assert.deepEqual(c.lost(), [30, 30, 30, 0]);
  assert.ok(Math.abs(attackTravel(PLAYER_MOVES.leap, 1) - 4) < 1e-9);
});

test('a leap turns to a foe that is roughly ahead and stops at its body', () => {
  const g = far(); g.player.z = 5; g.enemy.x = 1; g.enemy.z = 0; g.player.sprintTime = 1; g.action('light', 0, -1);
  assert.ok(Math.abs(g.player.yaw - Math.atan2(1, -5)) < 1e-9); const hp = g.enemy.hp; settle(g); assert.equal(g.enemy.hp, hp - 30);
  assert.ok(Math.hypot(g.player.x - g.enemy.x, g.player.z - g.enemy.z) >= g.player.radius + g.enemy.radius - 1e-6, 'it does not pass through the foe');
});

test('飛墨斬: guard and tap spends 20 qi on a crescent that flies 14 m and passes through three foes', () => {
  const g = new Crowd([[0, 3], [0, 6], [.5, 9], [0, 12], [3, 5]]); g.player.qi = 50; guarding(g);
  assert.equal(g.guardArt('light'), 'inkWave'); assert.equal(attackLabel(g), '飛墨'); assert.match(comboHint(g), /飛墨斬/);
  const stamina = g.player.stamina; assert.ok(g.action('light')); assert.equal(g.player.move, 'inkWave'); assert.equal(g.player.qi, 30); assert.equal(g.player.stamina, stamina);
  run(g, .2); assert.equal(g.arts.length, 0); assert.deepEqual(g.lost(), [0, 0, 0, 0, 0]);
  run(g, .1); assert.equal(g.arts.length, 1); run(g, 1.2);
  assert.deepEqual(g.lost(), [26, 26, 26, 0, 0], 'three in the line, not the fourth, not the one off to the side'); assert.equal(g.stats.hits, 3);
  assert.equal(g.player.qi, 30, 'an art gives no qi back'); assert.equal(g.arts.length, 0);
  const end = g.drainEvents().filter(e => e.type === 'art-end'); assert.equal(end.length, 1); assert.equal(end[0].spent, true);
});

test('飛墨斬 dies out at its range, hits a foe once, and falls back to the ordinary cut without qi', () => {
  const g = new Crowd([[0, 13.2], [0, 18]]); g.player.qi = 20; guarding(g); g.action('light'); run(g, 2);
  assert.deepEqual(g.lost(), [26, 0]);
  const events = g.drainEvents(), cast = events.find(e => e.type === 'art'), end = events.filter(e => e.type === 'art-end');
  assert.equal(end.length, 1); assert.equal(end[0].spent, false); assert.ok(Math.abs(end[0].z - cast.z - PLAYER_MOVES.inkWave.projectile.range) < 1e-6, `flew ${end[0].z - cast.z}`);
  // Qi is now gone: the same input is the first cut of the chain, paid in stamina.
  settle(g); guarding(g); assert.equal(g.guardArt('light'), null); assert.equal(g.guardArt('heavy'), null); assert.equal(attackLabel(g), '攻擊');
  assert.ok(g.action('light')); assert.equal(g.player.move, 'diagonal'); assert.equal(g.player.qi, 0);
  // A foe standing in the shot for many frames is still hit once.
  const near = new Crowd([[0, 1.4]]); near.player.qi = 20; guarding(near); near.action('light'); run(near, 1.2); assert.deepEqual(near.lost(), [26]);
});

test('an opening still comes first: guard and attack ripostes or executes without spending qi', () => {
  const g = far(); g.player.z = 2; g.enemy.z = 0; g.player.qi = 100; guarding(g); g.player.counterWindow = 1; g.action('heavy'); assert.equal(g.player.move, 'riposte'); assert.equal(g.player.qi, 100);
  const x = far(); x.player.z = 2; x.enemy.z = 0; x.player.qi = 100; guarding(x); x.enemy.exposed = true; x.enemy.state = 'stagger'; x.enemy.stun = 2.6; x.action('heavy'); assert.equal(x.player.move, 'execute'); assert.equal(x.player.qi, 100);
});

test('敕令 · 鎮: guard and hold spends 40 qi, wards the hero, and breaks posture all around within 4.5 m', () => {
  const g = new Crowd([[0, 4.2], [0, -4.2], [-4, 1], [0, 5.6]]); g.player.qi = 45; guarding(g); assert.equal(g.guardArt('heavy'), 'seal');
  const stamina = g.player.stamina; assert.ok(g.action('heavy')); assert.equal(g.player.move, 'seal'); assert.equal(g.player.state, 'heavy'); assert.equal(g.player.qi, 5); assert.equal(g.player.stamina, stamina);
  const swing = g.drainEvents().find(e => e.type === 'swing'); assert.equal(swing.art, 'seal');
  // Struck while the blade is going up: the ward holds.
  run(g, .3); const hp = g.player.hp; g.hitPlayer(40, g.enemies[0]); assert.equal(g.player.hp, hp); assert.equal(g.player.move, 'seal');
  assert.deepEqual(g.lost(), [0, 0, 0, 0]); run(g, .3);
  assert.deepEqual(g.lost(), [22, 22, 22, 0]); assert.deepEqual(g.enemies.map(e => e.posture >= 55), [true, true, true, false]);
  const ring = g.drainEvents().filter(e => e.type === 'art'); assert.equal(ring.length, 1); assert.deepEqual([ring[0].art, ring[0].radius], ['seal', 4.5]);
  settle(g); assert.equal(g.player.qi, 5); assert.equal(g.stats.hits, 3);
  // The ward is over before the move is: the recovery can be punished.
  assert.ok(PLAYER_MOVES.seal.ward < PLAYER_MOVES.seal.duration - .3);
  // Without the qi the hold is the ordinary heavy.
  guarding(g); assert.equal(g.guardArt('heavy'), null); g.action('heavy'); assert.equal(g.player.move, 'heavy');
});

test('one button: in guard a tap is the crescent and a hold is the seal; off a sprint the press itself leaps', () => {
  const make = () => { const g = far(), sent = []; const input = new SimpleAttack(name => { sent.push(name); return g.action(name); }); return { g, input, sent }; };
  const step = (g, input, seconds, held) => { for (let i = 0; i < Math.round(seconds / STEP); i++) { input.update(STEP, g); g.update(STEP, held); } };
  { const { g, input, sent } = make(); g.player.qi = 100; guarding(g); input.press('key', g); assert.equal(g.player.state, 'guard'); input.release('key', g); assert.deepEqual(sent, ['light']); assert.equal(g.player.move, 'inkWave'); assert.equal(g.player.qi, 80);
    // A second tap during the first is kept and, with guard still held, is another crescent.
    step(g, input, .45, { guard: true }); input.press('key', g); input.release('key', g); assert.ok(g.player.queuedLight); step(g, input, .3, { guard: true }); assert.equal(g.player.move, 'inkWave'); assert.equal(g.player.qi, 60); assert.equal(g.player.actionAge < .2, true);
    // Guard let go by the time it comes round: the buffered tap is an ordinary cut.
    step(g, input, .35, { guard: true }); input.press('key', g); input.release('key', g); assert.ok(g.player.queuedLight); step(g, input, .3, {}); assert.equal(g.player.move, 'diagonal'); assert.equal(g.player.qi, 60); }
  { const { g, input, sent } = make(); g.player.qi = 100; guarding(g); input.press('key', g); step(g, input, HEAVY_HOLD + .02, { guard: true }); assert.deepEqual(sent, ['heavy']); assert.equal(g.player.move, 'seal'); assert.equal(g.player.qi, 60); step(g, input, 2, { guard: true }); input.release('key', g); assert.deepEqual(sent, ['heavy']); assert.equal(g.player.state, 'guard'); }
  { const { g, input, sent } = make(); step(g, input, .3, { x: 1, z: 0, sprint: true }); input.press('key', g); assert.deepEqual(sent, ['light']); assert.equal(g.player.move, 'leap'); input.release('key', g); assert.deepEqual(sent, ['light']); }
});

test('in the campaign the same moves fan out over the pack, and a crescent in flight ends with the fight', () => {
  const g = new CampaignCombat(), p = g.player; g.deploy({ x: 0, z: p.z - 4, units: ['wolf', 'wolf', 'wolf', 'wolf'], index: 0 }); g.drainEvents();
  const pack = g.enemies.slice(-4), place = spots => pack.forEach((e, i) => { e.x = p.x + spots[i][0]; e.z = p.z + spots[i][1]; e.state = 'recover'; e.timer = 1000; e.hp = e.maxHp = 500; e.posture = 0; e.exposed = false; e.stun = 0; e.knockbackX = e.knockbackZ = 0; });
  const play = () => { for (let i = 0; i < 400 && (p.state !== 'idle' || g.arts.length); i++) g.update(STEP, {}); assert.equal(p.state, 'idle'); };
  const lost = () => pack.map(e => 500 - e.hp);
  for (const e of g.enemies) if (!pack.includes(e)) e.hp = 0;
  p.yaw = Math.PI; p.qi = 100; p.state = 'guard'; place([[0, -3], [0, -6], [0, -9], [0, -12]]); g.enemy = pack[0];
  assert.ok(g.action('light')); assert.equal(p.move, 'inkWave'); play();
  assert.deepEqual(lost(), [26, 26, 26, 0]); assert.equal(p.qi, 80);
  place([[0, -4], [0, 4], [4, 0], [-4, 0]]); p.state = 'guard'; assert.ok(g.action('heavy')); assert.equal(p.move, 'seal'); play();
  assert.deepEqual(lost(), [22, 22, 22, 22]); assert.equal(p.qi, 40);
  place([[0, -2], [0, 2], [2.2, 0], [0, -5]]); p.chain = 4; p.chainWindow = 1; g.enemy = pack[0]; assert.ok(g.action('light')); assert.equal(p.move, 'crash'); play();
  assert.deepEqual(lost(), [38, 10, 10, 0]);
  place([[0, -5.2], [1.6, -4], [-1.4, -3.2], [0, -9.5]]); p.stamina = 100; p.sprintTime = 1; g.enemy = pack[0]; assert.ok(g.action('light', 0, -1)); assert.equal(p.move, 'leap'); play();
  assert.deepEqual(lost(), [30, 30, 30, 0]);
  // Winning or dying with a shot in the air leaves nothing flying.
  const duel = far(); duel.player.qi = 20; guarding(duel); duel.action('light'); run(duel, .3); assert.equal(duel.arts.length, 1); duel.hitEnemy(9999); assert.equal(duel.status, 'won'); assert.equal(duel.arts.length, 0);
  const fallen = far(); fallen.player.qi = 20; guarding(fallen); fallen.action('light'); run(fallen, .3); assert.equal(fallen.arts.length, 1); fallen.hitPlayer(9999, fallen.enemy, true); assert.equal(fallen.status, 'lost'); assert.equal(fallen.arts.length, 0);
  duel.reset(2); assert.deepEqual(duel.arts, []); assert.equal(duel.player.sprintTime, 0);
});

test('sounds: the crescent is a draw and the shocks are stone, the seal loudest', () => {
  assert.equal(cueFor({ type: 'art', art: 'inkWave' }).sample, 'draw');
  for (const art of ['seal', 'leap', 'crash']) assert.equal(cueFor({ type: 'art', art }).sample, 'stone');
  assert.ok(cueFor({ type: 'art', art: 'seal' }).gain > cueFor({ type: 'art', art: 'crash' }).gain);
  assert.equal(cueFor({ type: 'art-end' }), null);
});

test('the skeletal hero plays every new move from clips it already has, hit frame on the hit', async () => {
  const parse = async path => { const bytes = await readFile(new URL('../dist/' + path.slice(2), import.meta.url)); return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); };
  globalThis.createImageBitmap ??= async () => ({ width: 4, height: 4, close() {} });
  const length = {};
  for (const id of ['twin', 'crash', 'leap', 'inkWave', 'seal']) {
    const steps = HERO_RIG.sequences[id], move = PLAYER_MOVES[id]; assert.ok(steps?.length, id);
    for (const [i, s] of steps.entries()) {
      assert.ok(HERO_RIG.clips[s.clip], `${id}: ${s.clip} is a clip the hero owns`);
      length[s.clip] ??= (await parse(HERO_RIG.clips[s.clip].src)).animations[0].duration;
      assert.ok(s.range[0] >= 0 && s.range[1] <= length[s.clip] + 1e-6, `${id}: ${s.clip} ${s.range} within ${length[s.clip]}`);
      if (i < steps.length - 1) assert.ok(s.to > (steps[i - 1]?.to ?? 0) && s.to < move.duration);
      if (s.hit != null) { assert.ok(s.hit > s.range[0] && s.hit < s.range[1]); assert.ok(s.at > (steps[i - 1]?.to ?? 0) && s.at < (s.to ?? move.duration)); }
    }
    // The last contact of the move shows the clip's contact frame.
    const last = steps.at(-1), state = move.projectile ? 'light' : id === 'seal' ? 'heavy' : 'light', at = move.impact;
    const pick = pickClip({ state, move: id, total: move.duration, timer: move.duration - at, speed: 0 }, HERO_RIG.clips, {}, HERO_RIG.sequences);
    assert.equal(pick.name, last.clip, id); assert.ok(Math.abs(scrubTime({}, length[last.clip], pick) - last.hit) < 1e-9, id);
  }
  // 雙燕迴翔's first cut has its own contact frame too.
  const first = pickClip({ state: 'light', move: 'twin', total: PLAYER_MOVES.twin.duration, timer: PLAYER_MOVES.twin.duration - PLAYER_MOVES.twin.hits[0].at }, HERO_RIG.clips, {}, HERO_RIG.sequences);
  assert.equal(first.name, 'light2'); assert.ok(Math.abs(scrubTime({}, 3, first) - HERO_RIG.sequences.twin[0].hit) < 1e-9);
});

test('the crescent is drawn where its shot is, the ring at the radius that strikes; pools are bounded and clear', () => {
  const scene = new THREE.Scene(), arts = new HeroArts(scene), objects = scene.children.length, world = { shake: 0 };
  const g = new Crowd([[0, 30]]); g.player.qi = 100;
  const frame = (seconds, input = {}) => { for (let i = 0; i < Math.round(seconds * 60); i++) { g.update(1 / 60, input); for (const e of g.drainEvents()) arts.emit(e, g, world); arts.update(1 / 60, g, world); } };
  guarding(g); g.action('light'); frame(.4); let s = arts.snapshot(); assert.equal(s.flying, 1); assert.equal(s.crescents, 1);
  assert.ok(Math.abs(s.positions[0][0] - g.arts[0].x) < .01 && Math.abs(s.positions[0][2] - g.arts[0].z) < .01);
  frame(1.5); s = arts.snapshot(); assert.equal(s.flying, 0); assert.equal(s.crescents, 0, 'a spent crescent fades out');
  // Many casts never grow the scene.
  for (let i = 0; i < 12; i++) { g.player.qi = 100; g.player.state = 'guard'; g.action('light'); frame(.3); g.player.state = 'guard'; }
  assert.equal(scene.children.length, objects); assert.ok(arts.snapshot().crescents <= 4); frame(2);
  g.player.qi = 100; g.player.state = 'guard'; g.action('heavy'); frame(.3); s = arts.snapshot(); assert.ok(s.ward > .2, 'the ring gathers before the plant'); assert.ok(s.wardRadius > 4.5);
  frame(.3); s = arts.snapshot(); assert.ok(Math.abs(s.wardRadius - 4.5) < .35, `ring at ${s.wardRadius}`); assert.ok(world.shake > .2); assert.ok(s.shocks >= 1);
  frame(3); assert.equal(arts.active(), false); assert.equal(arts.snapshot().ward, 0);
  g.player.qi = 100; g.player.state = 'guard'; g.action('light'); frame(.4); assert.ok(arts.active()); arts.update(1 / 60, null, world); assert.equal(arts.active(), false);
  // Interrupted before the plant: the ring lets go.
  const h = far(); h.player.qi = 100; guarding(h); h.action('heavy'); for (const e of h.drainEvents()) arts.emit(e, h, world); arts.update(1 / 60, h, world); assert.ok(arts.active());
  h.player.state = 'hurt'; h.player.timer = .3; for (let i = 0; i < 90; i++) arts.update(1 / 60, h, world); assert.equal(arts.active(), false);
});
