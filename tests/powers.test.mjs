import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCombat } from '../dist/campaign3d.js';
import { ArenaCombat } from '../dist/combat3d.js';
import { PLAYER_MOVES } from '../dist/attack-moves.js';
import { HERO_RIG } from '../dist/rig-clips.js';

const run = (g, seconds) => { for (let i = 0; i < seconds * 60; i++) g.update(1 / 60, {}); };
// Put one foe of the given role a few metres in front of the hero (the hero faces -z on the road) and wake it.
function facing(g, role, ahead = 3) {
  const p = g.player, e = g.enemies.find(v => v.role === role);
  e.x = p.x; e.z = p.z - ahead; e.alert = true; e.cooldown = 9; p.yaw = Math.PI;
  for (const other of g.enemies) if (other !== e) { other.hp = 0; other.state = 'dead'; }
  return e;
}
const last = g => g.drainEvents().filter(e => e.type === 'power-unavailable').at(-1);

test('the powers are ink arts with the costs and reach the design gives them', () => {
  const call = PLAYER_MOVES.callName, voice = PLAYER_MOVES.coldVoice;
  assert.equal(call.name, '喚名'); assert.equal(call.qiCost, 30); assert.equal(call.effect, 'call'); assert.equal(call.range, 6.5); assert.equal(call.stun, 1.6);
  assert.equal(voice.name, '寒聲'); assert.equal(voice.qiCost, 40); assert.equal(voice.effect, 'roar'); assert.equal(voice.range, 4.8); assert.equal(voice.posture, 30); assert.equal(voice.stun, 1.2);
  for (const m of [call, voice]) { assert.equal(m.art, true); assert.equal(m.damage, 0); assert.ok(m.impact < m.duration); }
  for (const id of ['callName', 'coldVoice']) assert.ok(HERO_RIG.sequences[id]?.every(step => step.clip === 'shout'), `${id} raises the blade with the shout clip`);
});

test('a power the hero has not earned does nothing', () => {
  const g = new CampaignCombat();
  g.player.qi = 100;
  assert.equal(g.action('callName'), false);
  assert.equal(g.player.qi, 100);
  assert.equal(g.player.state, 'idle');
  assert.equal(last(g).reason, 'locked');
});

test('喚名 cannot be used without enough ink, or in the middle of another move', () => {
  const g = new CampaignCombat(null, { powers: ['callName'] });
  g.player.qi = 29;
  assert.equal(g.action('callName'), false);
  assert.equal(last(g).reason, 'qi');
  g.player.qi = 100; g.player.state = 'roll'; g.player.timer = .3;
  assert.equal(g.action('callName'), false);
  assert.equal(last(g).reason, 'busy');
  assert.equal(g.player.qi, 100);
});

test('喚名 costs 30 ink and holds a bound soul in front of the hero', () => {
  const g = new CampaignCombat(null, { powers: ['callName'] }), p = g.player, wolf = facing(g, 'wolf');
  p.qi = 50;
  const hp = wolf.hp;
  assert.equal(g.action('callName'), true);
  assert.equal(p.qi, 20);
  let called = null;
  for (let i = 0; i < 60 && !called; i++) { g.update(1 / 60, {}); called = g.drainEvents().find(e => e.type === 'call-name'); }
  assert.ok(called?.hits.includes(wolf.id), 'the wolf answered');
  assert.ok(wolf.stun > 1 && wolf.state === 'stagger');
  assert.equal(wolf.hp, hp, 'a name is called, not cut');
});

test('喚名 means nothing to a foe that is not a bound soul', () => {
  const g = new CampaignCombat(null, { powers: ['callName'] });
  g.stage = 2; g.spawnStage();
  const alpha = facing(g, 'alpha'), stun = alpha.stun;
  g.player.qi = 100; g.action('callName'); run(g, 1);
  assert.equal(alpha.stun, stun);
  assert.notEqual(alpha.state, 'stagger');
});

test('寒聲 holds troops all round, even behind the hero', () => {
  const g = new CampaignCombat(null, { powers: ['coldVoice'] }), p = g.player, wolf = facing(g, 'wolf', -2.5);
  p.qi = 100;
  assert.equal(g.action('coldVoice'), true);
  assert.equal(p.qi, 60);
  run(g, .7);
  assert.ok(wolf.stun > .5 && wolf.state === 'stagger');
});

test('寒聲 wears down a master’s stance instead of holding it', () => {
  const g = new CampaignCombat(null, { powers: ['coldVoice'] });
  g.stage = 9; g.spawnStage();
  const boss = facing(g, 'nameless', 2.5), before = boss.posture;
  g.player.qi = 100; g.action('coldVoice'); run(g, .7);
  assert.ok(boss.posture >= before + 30 || boss.exposed, `posture ${before} → ${boss.posture}`);
  assert.equal(boss.hp, boss.maxHp);
});

test('in a duel, 寒聲 still reaches the foe and 喚名 does not', () => {
  const g = new ArenaCombat(0);
  g.powers = new Set(['callName', 'coldVoice']);
  const e = g.enemy; e.x = g.player.x; e.z = g.player.z - 2.5; g.player.yaw = Math.PI; e.cooldown = 9;
  g.player.qi = 100; g.action('callName'); run(g, 1);
  assert.equal(e.posture, 0);
  g.player.qi = 100; g.action('coldVoice'); run(g, 1);
  assert.ok(e.posture > 0 || e.exposed);
});

test('a retried checkpoint still knows its powers', () => {
  const g = new CampaignCombat(null, { powers: ['callName'] }), again = g.retryCheckpoint();
  again.player.qi = 100;
  assert.equal(again.action('callName'), true);
});

test('a call is heard: a bell for 喚名, struck stone for 寒聲', async () => {
  const { cueFor } = await import('../dist/audio3d.js');
  assert.equal(cueFor({ type: 'call-name', hits: [] })?.sample, 'bell');
  assert.equal(cueFor({ type: 'cold-voice', hits: [] })?.sample, 'stone');
});

test('a call is seen: a ring runs out to the reach of the call', async () => {
  const THREE = await import('../dist/vendor/three.module.js'), { HeroArts } = await import('../dist/hero-arts3d.js');
  const arts = new HeroArts(new THREE.Scene()), waves = [], rings = [], game = { player: { x: 0, z: 0 } };
  const world = { ultimate: { wave: (...a) => waves.push(a) }, combatVFX: { ring: (...a) => rings.push(a), dust() {} } };
  arts.emit({ type: 'call-name', x: 1, z: 2, yaw: 0, radius: 6.5, hits: [] }, game, world);
  arts.emit({ type: 'cold-voice', x: 1, z: 2, yaw: 0, radius: 4.8, hits: [] }, game, world);
  assert.deepEqual(waves.map(w => +(w[3] * .88).toFixed(2)), [6.5, 4.8]);
  assert.equal(rings.length, 2);
  assert.notEqual(rings[0][3], rings[1][3], 'the two calls are told apart by colour');
});

test('a call does not stretch the window on a foe whose stance is already broken', () => {
  const g = new CampaignCombat(null, { powers: ['callName', 'coldVoice'] }), wolf = facing(g, 'wolf');
  wolf.exposed = true; wolf.state = 'stagger'; wolf.stun = .6; wolf.timer = wolf.total = 2.6;
  g.player.qi = 100; g.action('callName');
  let called = null;
  for (let i = 0; i < 60 && !called; i++) { g.update(1 / 60, {}); called = g.drainEvents().find(e => e.type === 'call-name'); }
  assert.ok(wolf.stun < .6, `the window keeps running down (stun ${wolf.stun.toFixed(2)})`);
  assert.ok(!called.hits.includes(wolf.id), 'a broken foe is not counted as answering');
});

test('each power has its own cooldown, and a power used too soon is refused with the reason', () => {
  const g = new CampaignCombat(null, { powers: ['callName', 'coldVoice'] });
  assert.equal(PLAYER_MOVES.callName.cooldown, 4);
  assert.equal(PLAYER_MOVES.coldVoice.cooldown, 8);
  g.player.qi = 100;
  assert.equal(g.action('callName'), true);
  run(g, 1);
  g.player.qi = 100;
  assert.equal(g.action('callName'), false);
  assert.equal(last(g).reason, 'cooldown');
  assert.equal(g.action('coldVoice'), true, 'the other power has its own clock');
  run(g, 3.2);
  g.player.qi = 100;
  assert.equal(g.action('callName'), true, 'ready again after four seconds');
});
