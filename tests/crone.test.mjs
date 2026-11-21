import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCombat, ROLES, BELL_REACH } from '../dist/campaign3d.js';
import { roleSequence } from '../dist/enemy-patterns.js';

const run = (g, seconds, input = {}) => { const seen = []; for (let i = 0; i < Math.round(seconds * 60); i++) { g.hitStop = 0; g.update(1 / 60, input); seen.push(...g.drainEvents()); } return seen; };
// The crone's cave, with the crone held still so each rule can be watched on its own.
function atCrone(powers = ['callName']) {
  const g = new CampaignCombat(null, { realm: 'snow', powers });
  g.stage = 4; g.spawnStage(); g.drainEvents();
  const crone = g.enemies[0]; crone.alert = true; crone.cooldown = 99;
  return { g, crone, p: g.player };
}
const standBy = (p, x, z) => { p.x = x; p.z = z; p.state = 'idle'; p.stun = 0; p.hp = p.maxHp; };
const call = (g) => { g.player.qi = 100; g.powerWait.callName = 0; assert.equal(g.action('callName'), true); return run(g, 1); };

test('blades do nothing to the crone while one bell still holds', () => {
  const { g, crone, p } = atCrone(), events = [];
  for (const move of ['light', 'heavy', 'special']) {
    standBy(p, crone.x, crone.z + 1.6); p.yaw = Math.PI; p.qi = 100; crone.cooldown = 99;
    g.action(move); events.push(...run(g, 1.2));
  }
  g.withEnemy(crone, () => g.hitEnemy(999, 999, 'execution-hit')); events.push(...g.drainEvents());
  assert.equal(crone.hp, crone.maxHp);
  assert.equal(crone.posture, 0);
  const turned = events.filter(e => e.type === 'armour-turn');
  assert.ok(turned.length >= 2, `${turned.length} cuts turned aside`);
  assert.deepEqual(turned.map(e => e.first), [true, ...turned.slice(1).map(() => false)]);
});

test('寒聲 cannot shake her armour', () => {
  const { g, crone, p } = atCrone(['coldVoice']);
  standBy(p, crone.x, crone.z + 2.5); p.yaw = Math.PI; p.qi = 100;
  assert.equal(g.action('coldVoice'), true); run(g, 1);
  assert.equal(crone.posture, 0);
});

test('calling a name beside a bell breaks it and cracks the armour', () => {
  const { g, crone, p } = atCrone();
  assert.equal(crone.armour, 4);
  standBy(p, -9.5 + 3, 3);
  const broke = call(g).filter(e => e.type === 'bell-break');
  assert.ok(g.bells.find(b => b.id === 'b1').broken);
  assert.equal(crone.armour, 3);
  assert.equal(broke.length, 1);
  assert.equal(broke[0].name, '老周'); assert.equal(broke[0].broken, 1); assert.equal(broke[0].total, 4);
});

test('a bell out of reach does not answer', () => {
  const { g, p } = atCrone();
  standBy(p, 0, 3);
  for (const b of g.bells) assert.ok(Math.hypot(p.x - b.x, p.z - b.z) > BELL_REACH + 1, b.id);
  call(g);
  assert.ok(g.bells.every(b => !b.broken));
});

test('the last bell drops the armour, angers her, and blades bite again', () => {
  const { g, crone, p } = atCrone(), events = [];
  for (const b of [...g.bells]) { standBy(p, b.x + (b.x > 0 ? -2 : 2), b.z); crone.cooldown = 99; events.push(...call(g)); if (crone.armour === 0) break; }
  assert.equal(crone.armour, 0);
  assert.ok(events.some(e => e.type === 'armour-fall'));
  assert.equal(crone.enraged, true);
  const hp = crone.hp; g.withEnemy(crone, () => g.hitEnemy(40, 10));
  assert.equal(crone.hp, hp - 40);
});

test('the falling armour leaves her reeling for a breath', () => {
  const { g, crone, p } = atCrone();
  for (const b of g.bells) b.broken = b.id !== 'b4';
  crone.armour = 1;
  standBy(p, 4, -8.5);
  g.player.qi = 100; g.powerWait.callName = 0; g.action('callName');
  let fell = false;
  for (let i = 0; i < 60 && !fell; i++) { g.hitStop = 0; g.update(1 / 60, {}); fell = g.drainEvents().some(e => e.type === 'armour-fall'); }
  assert.ok(fell);
  assert.equal(crone.state, 'stagger'); assert.ok(crone.stun > 1.5); assert.equal(crone.exposed, false);
});

test('the way on points to the nearest whole bell while she is armoured', () => {
  const { g, p } = atCrone();
  standBy(p, 7, 3);
  assert.deepEqual(g.waypoint(), { x: 9.5, z: 3, kind: 'bell', id: 'b2' });
  g.bells.find(b => b.id === 'b2').broken = true;
  assert.equal(g.waypoint().id, 'b4', 'b4 is 11.5 m away, b1 16.5 m');
});

test('a retry at the crone\'s checkpoint finds every bell whole', () => {
  const { g, p } = atCrone();
  standBy(p, -7.5, 3); call(g);
  assert.ok(g.bells.some(b => b.broken));
  const again = g.retryCheckpoint();
  assert.ok(again.bells.length === 4 && again.bells.every(b => !b.broken));
  assert.equal(again.enemies[0].armour, 4);
});

test('the armour is a rule of the role, not the body', () => {
  const skin = ROLES.crone.skin;
  try {
    delete ROLES.crone.skin;
    const { g, crone } = atCrone();
    g.withEnemy(crone, () => g.hitEnemy(80, 80));
    assert.equal(crone.hp, crone.maxHp);
  } catch (e) { if (!(e instanceof TypeError)) throw e; } // ROLES is frozen: the role never knew its body anyway
  finally { if (Object.isExtensible(ROLES.crone)) ROLES.crone.skin = skin; }
  const { g, crone } = atCrone();
  g.withEnemy(crone, () => g.hitEnemy(80, 80));
  assert.equal(crone.hp, crone.maxHp);
});

test('she casts from afar and slams up close, and her temper lengthens every chain', () => {
  assert.equal(roleSequence('crone', 0, false, 8)[0].name, '鈴聲');
  assert.deepEqual(roleSequence('crone', 0, false, 2).map(m => m.name), ['凍地']);
  assert.equal(roleSequence('crone', 0, true, 2).length, 2);
  assert.equal(roleSequence('crone', 0, true, 8)[0].projectile.spread.length, 3);
  assert.ok(roleSequence('crone', 0, true, 2)[0].windup < roleSequence('crone', 0, false, 2)[0].windup);
});

test('an armoured crone keeps her distance; bare, she closes in', () => {
  const { g, crone, p } = atCrone();
  standBy(p, 0, 4); crone.x = 0; crone.z = 0; crone.cooldown = 99;
  run(g, 1.5);
  const armoured = Math.hypot(crone.x - p.x, crone.z - p.z);
  assert.ok(armoured > 5, `armoured she backs off to ${armoured.toFixed(1)} m`);
});
