import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Progress, realmCards } from '../dist/progress.js';

const read = name => readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');

test('a first-time player sees the one journey card, unchanged', () => {
  const cards = realmCards(new Progress(null));
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0], { id: 'mountain', name: '借名山', blurb: '山神借走了村民的名字', first: true });
});

test('the start screen keeps the existing campaign button for the first realm', () => {
  assert.match(read('index.html'), /<button id="campaign" class="mode-card campaign">/);
});

test('power buttons start hidden, sit with the other support moves, and are wired by their action', () => {
  const html = read('index.html'), row = html.match(/<div class="combat-utilities"[^>]*>([\s\S]*?)<\/div>/)[1];
  for (const id of ['callName', 'coldVoice']) assert.match(row, new RegExp(`<button[^>]*data-action="${id}"[^>]*hidden`), id);
  assert.ok(row.indexOf('callName') < row.indexOf('data-action="heal"'), 'the powers come before 飲藥, so 飲藥 and 絕技 keep their place at the edge');
});

test('the keys for the powers are G and V, and a refused power says why', () => {
  const game = read('game3d.js');
  assert.match(game, /if\(key==='g'\)action\('callName'\)/);
  assert.match(game, /if\(key==='v'\)action\('coldVoice'\)/);
  assert.match(game, /e\.type==='power-unavailable'/);
  assert.match(game, /'尚未習得'/);
  assert.match(game, /'墨氣不足'/);
});
