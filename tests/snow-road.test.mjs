import test from 'node:test';
import assert from 'node:assert/strict';
import { REALMS, realmById } from '../dist/realms.js';
import { CampaignCombat, ROLES } from '../dist/campaign3d.js';
import { Progress, PROGRESS_KEY } from '../dist/progress.js';

// What every road must be, whichever realm it climbs: one walkable strip, its chapters running north,
// and everything on it standing where the hero can reach it.
function roadIsSound(realm) {
  const { JOURNEY, STATIONS, ZONES, STAGES, PICKUPS, bounds, contains } = realm;
  let last = bounds(JOURNEY.south);
  for (let z = JOURNEY.south; z >= JOURNEY.north; z -= .25) {
    const b = bounds(z);
    assert.ok(b.max - b.min >= 6, `${realm.id}: wide enough to fight at ${z}`);
    assert.ok(Math.abs(b.min - last.min) < 1.9 && Math.abs(b.max - last.max) < 1.9, `${realm.id}: no jump at ${z}`);
    last = b;
  }
  for (let i = 1; i < STATIONS.length; i++) assert.ok(STATIONS[i][0] < STATIONS[i - 1][0] && STATIONS[i][1] < STATIONS[i][2], `${realm.id}: station ${i}`);
  assert.equal(ZONES[0].from, JOURNEY.south); assert.equal(ZONES.at(-1).to, JOURNEY.north);
  for (let i = 1; i < ZONES.length; i++) assert.equal(ZONES[i].from, ZONES[i - 1].to, `${realm.id}: zones meet`);
  let gate = JOURNEY.south;
  for (const stage of STAGES) {
    assert.ok(stage.gate <= gate, `${realm.id}: ${stage.id} is north of the last`); gate = stage.gate;
    assert.ok(stage.goal && stage.onward && stage.name && stage.zone, `${realm.id}: ${stage.id} has its words`);
    assert.ok(ZONES.some(z => z.name === stage.zone), `${realm.id}: ${stage.id} is in a known zone`);
    for (const g of stage.groups) {
      assert.ok(contains(g.x, g.z, 1), `${realm.id}: ${stage.id} group at ${g.z}`);
      assert.ok(g.z > stage.gate, `${realm.id}: ${stage.id} group in front of its gate`);
      if (g.when?.z != null) assert.ok(g.when.z > g.z && g.when.z > stage.gate + 1);
      for (const role of g.units) assert.ok(ROLES[role], `${realm.id}: role ${role}`);
    }
    assert.ok(stage.groups.some(g => !g.when), `${realm.id}: someone waits in ${stage.id}`);
    if (!stage.instant && !stage.final) { assert.ok(stage.gateName); const b = bounds(stage.gate); assert.ok(b.max - b.min <= 11, `${realm.id}: ${stage.id} gate in a doorway`); }
  }
  assert.equal(STAGES.at(-1).final, true);
  for (const item of PICKUPS) assert.ok(contains(item.x, item.z, .8), `${realm.id}: ${item.id}`);
  assert.equal(new Set(PICKUPS.map(p => p.id)).size, PICKUPS.length);
}

test('every realm\'s road is sound', () => { for (const realm of REALMS) roadIsSound(realm); });

test('the snow road is about half the mountain, five chapters ending in the bell cave', () => {
  const snow = realmById('snow');
  assert.equal(REALMS[1], snow);
  assert.equal(snow.name, '寒聲嶺');
  assert.equal(snow.boss, 'crone'); assert.equal(snow.reward, 'coldVoice');
  assert.equal(snow.rubbingTotal, 6);
  assert.deepEqual(snow.STAGES.map(s => s.id), ['hush', 'slope', 'lake', 'cavemouth', 'crone']);
  const length = snow.JOURNEY.south - snow.JOURNEY.north;
  assert.ok(length >= 170 && length <= 230, `length ${length}`);
  assert.equal(snow.STAGES.at(-1).bells.length, 4);
  for (const b of snow.BELLS) {
    assert.ok(snow.contains(b.x, b.z, 1), b.id);
    const r = Math.hypot(b.x, b.z); assert.ok(r >= 8 && r <= 12, `${b.id} ${r}`);
    assert.ok(b.name && b.text, b.id);
  }
  assert.deepEqual(snow.BELLS.map(b => b.name), ['老周', '石生', '秋娘', '阿聆']);
});

test('chapter ids are never shared between realms', () => {
  const ids = REALMS.flatMap(r => r.STAGES.map(s => s.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('each realm says in its own words how it opens, what is found and how it is won', () => {
  for (const realm of REALMS) {
    assert.ok(realm.opening && realm.findName && realm.wonHint, realm.id);
    assert.ok(realm.victory?.title && realm.victory?.text, realm.id);
  }
  assert.equal(realmById('mountain').findName, '名拓');
  assert.equal(realmById('snow').findName, '冰聲');
});

test('the snow opens once the mountain is cleared, never before', () => {
  const store = (data) => { const m = new Map(data ? [[PROGRESS_KEY, JSON.stringify(data)]] : []); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
  assert.deepEqual(new Progress(store()).unlocked().map(r => r.id), ['mountain']);
  assert.deepEqual(new Progress(store({ v: 1, cleared: ['mountain'], powers: ['callName'], complete: [] })).unlocked().map(r => r.id), ['mountain', 'snow']);
});

test('a snow run starts at the foot of the snow road with ice foxes ahead', () => {
  const g = new CampaignCombat(null, { realm: 'snow' }), snow = realmById('snow');
  assert.equal(g.player.x, snow.JOURNEY.start.x); assert.equal(g.player.z, snow.JOURNEY.start.z);
  assert.deepEqual(g.enemies.map(e => e.role), ['fox', 'fox', 'fox']);
  assert.ok(g.enemies.every(e => e.identity.name === '冰狐'));
});

test('the snow\'s four roles are who the design says', () => {
  assert.equal(ROLES.fox.skin, 'fox'); assert.equal(ROLES.fox.kind, 'wolf');
  assert.equal(ROLES.traveller.named, true, 'a frozen traveller still answers to a name');
  assert.equal(ROLES.howler.elite, true); assert.equal(ROLES.howler.kind, 'oni');
  assert.equal(ROLES.crone.boss, true); assert.equal(ROLES.crone.name, '凍聲婆');
});
