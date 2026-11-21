import test from 'node:test';
import assert from 'node:assert/strict';
import { REALMS, realmById } from '../dist/realms.js';
import * as journey from '../dist/journey3d.js';
import { makeRoute } from '../dist/journey3d.js';
import { CampaignCombat, ROLES } from '../dist/campaign3d.js';

// Each realm is its own road. The mountain was the only one, so moving it into a realm must not move a single stone.
test('the mountain is the first realm and keeps its road exactly', () => {
  const m = realmById('mountain');
  assert.equal(REALMS[0], m);
  assert.equal(m.STAGES, journey.STAGES);
  assert.equal(m.PICKUPS, journey.PICKUPS);
  assert.equal(m.rubbingTotal, 12);
  for (const z of [339, 300, 241, 150, 61, 12, 0, -9]) assert.deepEqual(m.bounds(z), journey.bounds(z), `z = ${z}`);
  assert.equal(m.zoneAt(200).id, journey.zoneAt(200).id);
  assert.throws(() => realmById('nowhere'), /unknown realm nowhere/);
});

test('a route without a courtyard ends at its last station', () => {
  const r = makeRoute({ journey: { south: 50, north: 0, start: { x: 0, z: 48 } }, stations: [[50, -5, 5], [10, -3, 3]], zones: [] });
  assert.deepEqual(r.bounds(0), { min: -3, max: 3 });
  assert.ok(r.contains(0, 30) && !r.contains(6, 30));
  assert.equal(r.centre(30), 0);
});

test('a campaign carries its realm, powers and vigor through a retry', () => {
  const g = new CampaignCombat(null, { powers: ['callName'], vigor: 20 });
  assert.equal(g.realm.id, 'mountain');
  assert.ok(g.powers.has('callName'));
  assert.equal(g.player.maxHp, 160);
  assert.equal(g.player.hp, 160);
  const again = g.retryCheckpoint();
  assert.equal(again.realm.id, 'mountain');
  assert.ok(again.powers.has('callName'));
  assert.equal(again.player.maxHp, 160);
});

test('a plain campaign is the mountain with no powers and the usual health', () => {
  const g = new CampaignCombat();
  assert.equal(g.realm.id, 'mountain');
  assert.equal(g.powers.size, 0);
  assert.equal(g.player.maxHp, 140);
});

test('bound souls are named; masters and elites are not', () => {
  for (const id of ['wolf', 'mare', 'shade', 'thrall']) assert.equal(ROLES[id].named, true, id);
  for (const id of ['alpha', 'hanzhou', 'oni', 'nameless', 'lion', 'acolyte', 'scribe']) assert.ok(!ROLES[id].named, id);
});
