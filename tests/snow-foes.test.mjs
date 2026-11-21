import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCombat } from '../dist/campaign3d.js';
import { ArenaCombat } from '../dist/combat3d.js';
import { roleSequence } from '../dist/enemy-patterns.js';

const step = (g, seconds, input = {}) => { for (let i = 0; i < Math.round(seconds * 60); i++) { g.hitStop = 0; g.update(1 / 60, input); } };
const snowAt = stage => { const g = new CampaignCombat(null, { realm: 'snow' }); g.stage = stage; g.spawnStage(); g.drainEvents(); return g; };
// Put one foe of the role a few metres in front of the hero (the hero faces -z) and clear everyone else away.
function facing(g, role, ahead) {
  const p = g.player, e = g.enemies.find(v => v.role === role);
  e.x = p.x; e.z = p.z - ahead; e.alert = true; e.cooldown = 9; p.yaw = Math.PI;
  for (const other of g.enemies) if (other !== e) { other.hp = 0; other.state = 'dead'; }
  g.pending = [];
  return e;
}

test('an ice fox bites and darts like a starved shadow', () => {
  assert.equal(roleSequence('fox', 0, false, 5)[0].name, '雪影撲');
  assert.deepEqual(roleSequence('fox', 1, false, 2).map(m => m.name), ['冰牙', '雪影撲']);
  assert.ok(roleSequence('fox', 0, true, 2)[0].windup < roleSequence('fox', 0, false, 2)[0].windup, 'a roused fox is quicker');
});

test('a frozen traveller swings slow and heavy', () => {
  assert.deepEqual(roleSequence('traveller', 0, false, 2).map(m => m.name), ['凍臂劈']);
  assert.deepEqual(roleSequence('traveller', 1, false, 2).map(m => m.name), ['踉蹌橫掃', '凍臂劈']);
  assert.ok(roleSequence('traveller', 0, false, 2)[0].windup >= .9);
});

test('a frozen traveller leaves a ring of ice where it falls, and the ice slows the hero', () => {
  const g = snowAt(1), p = g.player, e = facing(g, 'traveller', 2.5);
  e.hp = 1; g.withEnemy(e, () => g.hitEnemy(5));
  const patch = g.drainEvents().filter(v => v.type === 'frost-patch');
  assert.equal(patch.length, 1);
  assert.equal(g.frosts.length, 1);
  const walk = (x, z) => { p.x = x; p.z = z; p.state = 'idle'; p.stun = 0; const from = p.z; step(g, .5, { z: -1 }); return from - p.z; };
  const onIce = walk(e.x, e.z), offIce = walk(e.x, e.z + 7);
  assert.ok(onIce < offIce * .65, `on ice ${onIce.toFixed(2)} m, off ice ${offIce.toFixed(2)} m`);
  step(g, 9.1);
  assert.equal(g.frosts.length, 0, 'the ice melts');
});

test('ice slows the hero only inside its ring', () => {
  const g = snowAt(1), p = g.player;
  g.frosts.push({ x: p.x, z: p.z, radius: 2.6, time: 9, slow: .55 });
  assert.equal(g.footing(), .55);
  p.x += 3;
  assert.equal(g.footing(), 1);
});

test('the howler\'s roar pushes the hero back even through a guard', () => {
  const g = snowAt(2), p = g.player;
  g.deploy(g.pending.find(v => v.units.includes('howler')));
  const e = facing(g, 'howler', 6);
  e.cooldown = 0; e.rangedCooldown = 0;
  const before = Math.hypot(p.x - e.x, p.z - e.z);
  let gust = false;
  for (let i = 0; i < 156; i++) { g.hitStop = 0; g.update(1 / 60, { guard: true }); if (g.drainEvents().some(v => v.type === 'gust')) gust = true; }
  assert.ok(gust, 'the roar landed');
  const after = Math.hypot(p.x - e.x, p.z - e.z);
  assert.ok(after - before >= 2, `pushed ${(after - before).toFixed(2)} m`);
});

test('a duel\'s footing is always sure', () => {
  assert.equal(new ArenaCombat(0).footing(), 1);
});
