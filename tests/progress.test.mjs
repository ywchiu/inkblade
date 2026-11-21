import test from 'node:test';
import assert from 'node:assert/strict';
import { Progress, PROGRESS_KEY, VIGOR_STEP } from '../dist/progress.js';

const fakeStorage = (seed = {}) => { const m = new Map(Object.entries(seed)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };

test('a new player has only the mountain and no powers', () => {
  const p = new Progress(fakeStorage());
  assert.deepEqual(p.unlocked().map(r => r.id), ['mountain']);
  assert.equal(p.powers.size, 0);
  assert.equal(p.vigor(), 0);
});

test('clearing the mountain grants 喚名 once and is saved', () => {
  const s = fakeStorage(), p = new Progress(s);
  assert.equal(p.clear('mountain'), 'callName');
  assert.equal(p.clear('mountain'), null);
  const again = new Progress(s);
  assert.ok(again.cleared.has('mountain') && again.powers.has('callName'));
  assert.equal(JSON.parse(s.map.get(PROGRESS_KEY)).v, 1);
});

test('collecting a realm’s every hidden name raises the hero’s health once', () => {
  const s = fakeStorage(), p = new Progress(s);
  assert.equal(p.completeSet('mountain'), true);
  assert.equal(p.completeSet('mountain'), false);
  assert.equal(new Progress(s).vigor(), VIGOR_STEP);
  assert.equal(VIGOR_STEP, 20);
});

test('a player who finished before this update counts as having cleared the mountain', () => {
  const s = fakeStorage({ 'inkblade.journal.v1': JSON.stringify(['opening', 'ending']), 'inkblade.names.v1': JSON.stringify(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12']) });
  const p = new Progress(s);
  assert.ok(p.cleared.has('mountain') && p.powers.has('callName') && p.complete.has('mountain'));
  assert.equal(p.vigor(), 20);
});

test('the old journal is read only once, before any progress was saved', () => {
  const s = fakeStorage({ 'inkblade.journal.v1': JSON.stringify(['opening']) });
  new Progress(s);
  s.setItem('inkblade.journal.v1', JSON.stringify(['opening', 'ending']));
  assert.equal(new Progress(s).cleared.size, 0, 'a saved progress is the record from then on');
});

test('broken or missing storage starts a fresh run without throwing', () => {
  assert.doesNotThrow(() => new Progress(null));
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const p = new Progress(broken);
  assert.equal(p.clear('mountain'), 'callName', 'still works for this visit');
  const junk = new Progress(fakeStorage({ [PROGRESS_KEY]: '{not json' }));
  assert.equal(junk.cleared.size, 0);
  const strange = new Progress(fakeStorage({ [PROGRESS_KEY]: JSON.stringify({ v: 1, cleared: ['mountain', 'atlantis'], powers: ['callName', 'laser'], complete: 'all' }) }));
  assert.deepEqual([...strange.cleared], ['mountain']);
  assert.deepEqual([...strange.powers], ['callName']);
  assert.equal(strange.complete.size, 0);
});
