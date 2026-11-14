import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toEnglish, misses, t, getLang } from '../dist/i18n.js';
import { EN, EN_PATTERNS } from '../dist/lang-en.js';
import * as story from '../dist/story3d.js';
import * as journey from '../dist/journey3d.js';
import * as campaign from '../dist/campaign3d.js';
import * as combat from '../dist/combat3d.js';
import { PLAYER_MOVES } from '../dist/attack-moves.js';

const CJK = /[㐀-鿿]/;
// Lettering that is part of the logo or painted on screen as a seal, kept in both languages.
const LETTERING = new Set(Object.keys(EN).filter(k => EN[k] === k));
const english = text => { const out = toEnglish(text); return !CJK.test(out) || LETTERING.has(text.trim()); };

// Every Chinese string in a module's exported data, with the path it was found at.
function strings(module, skip = () => false) {
  const out = [], seen = new Set();
  const walk = (value, path) => {
    if (typeof value === 'string') { if (CJK.test(value) && !skip(path)) out.push([path, value]); return; }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    for (const [key, inner] of Object.entries(value)) walk(inner, `${path}.${key}`);
  };
  for (const [name, value] of Object.entries(module)) if (typeof value !== 'function') walk(value, name);
  return out;
}
// A gate's name is carved on its plaque in the scene and is not page text.
const plaque = path => path.endsWith('.gateName');
const untranslated = list => list.filter(([, text]) => !english(text)).map(([path, text]) => `${path}: ${text}`);

test('a Chinese string is looked up whole, and anything else passes through', () => {
  assert.equal(toEnglish('開始征途'), 'Begin the Journey');
  assert.equal(toEnglish('WASD'), 'WASD');
  assert.equal(toEnglish('  開始征途\n'), '  Begin the Journey\n', 'the space around it is kept');
  assert.equal(t('開始征途'), '開始征途', 'outside a browser the game stays in Chinese');
  assert.equal(getLang(), 'zh');
});

test('numbers are carried into the English line', () => {
  assert.equal(toEnglish('墨氣 45 / 100'), 'Ink 45 / 100');
  assert.equal(toEnglish('擊破 7 · 剩餘 2 · 名拓 3/12'), 'Felled 7 · Left 2 · Rubbings 3/12');
  assert.equal(toEnglish('12 連擊'), '12 hits');
});

test('a heading set one character at a time is read closed up and set in capitals', () => {
  assert.equal(toEnglish('無 雙 征 途'), toEnglish('無雙征途').toUpperCase());
  const spaced = toEnglish('鎮 祟 寺 · 雨 夜');
  assert.ok(!CJK.test(spaced) && spaced === spaced.toUpperCase() && spaced.includes(' · '), spaced);
});

test('a line built from parts is translated part by part', () => {
  const rising = PLAYER_MOVES.rising.name, sweep = PLAYER_MOVES.sweep.name, wave = PLAYER_MOVES.inkWave.name, seal = PLAYER_MOVES.seal.name;
  assert.equal(toEnglish(`長按 J · ${rising}`), `Hold J · ${EN[rising]}`);
  assert.equal(toEnglish(`長按攻擊 · ${sweep}`), `${EN['長按攻擊']} · ${EN[sweep]}`);
  // The seal's own name has a separator in it and must stay in one piece.
  assert.equal(toEnglish(`短按 J · ${wave} ｜ 長按 · ${seal}`), `Tap J · ${EN[wave]} | ${EN['長按']} · ${EN[seal]}`);
  for (const move of Object.values(PLAYER_MOVES)) {
    if (!move.name) continue;
    for (const line of [`${move.name} · 已接招`, `${move.name} · 長按 J · ${sweep}`, `按 J · ${move.name}`]) assert.ok(english(line), `${line} → ${toEnglish(line)}`);
  }
});

test('a line that carries a name through keeps the name', () => {
  for (const { name } of Object.values(story.IDENTITIES)) {
    const line = toEnglish(`已擊敗${name}。`);
    assert.ok(!CJK.test(line) && line.includes(EN[name]), line);
  }
  assert.equal(toEnglish('載入失敗：TypeError: x is undefined'), 'Failed to load: TypeError: x is undefined');
});

test('a string with no English is shown as written and reported', () => {
  const unknown = '這一句沒有翻譯';
  assert.equal(toEnglish(unknown), unknown);
  assert.ok(misses.has(unknown));
  misses.delete(unknown);
});

test('the dictionary is English: only the kept lettering maps to itself', () => {
  for (const [zh, en] of Object.entries(EN)) {
    assert.ok(CJK.test(zh), `key without Chinese: ${zh}`);
    assert.ok(en && typeof en === 'string', `empty entry: ${zh}`);
    if (CJK.test(en)) assert.equal(en, zh, `Chinese left in the English for ${zh}: ${en}`);
  }
  assert.ok(LETTERING.size <= 12, 'kept lettering is the logo and the ultimate’s seal, nothing more');
  for (const [pattern, build] of EN_PATTERNS) assert.ok(pattern instanceof RegExp && typeof build === 'function');
});

test('the story is covered: every scene, line, bark, name and source', () => {
  const list = strings(story);
  assert.ok(list.length > 250, 'the story data was found');
  assert.deepEqual(untranslated(list), []);
  for (const [id, scene] of Object.entries(story.SCENES)) for (const line of scene.lines || []) {
    const text = typeof line === 'string' ? line : line.text;
    if (text) assert.notEqual(toEnglish(text), text, `${id}: ${text}`);
  }
});

test('the road is covered: stages, goals, zones and rubbings', () => {
  const list = strings(journey, plaque);
  assert.ok(list.length > 40);
  assert.deepEqual(untranslated(list), []);
});

test('the fight is covered: foes, their roles, hints and every move name', () => {
  const list = [...strings(campaign, plaque), ...strings(combat), ...strings({ PLAYER_MOVES })];
  assert.ok(list.length > 40);
  assert.deepEqual(untranslated(list), []);
  // A warning is composed around the move's name.
  const names = list.filter(([path]) => path.endsWith('.name')).map(([, text]) => text);
  for (const name of names) for (const line of [`危 · ${name} · 閃避`, `危 · ${name} · 側閃`, `${name} · 2 / 3`]) assert.ok(english(line), `${line} → ${toEnglish(line)}`);
});

test('the page itself is covered: every piece of text and every label in index.html', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const body = html.slice(html.indexOf('<body')).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]*translate="no"[^>]*>[^<]*/g, '');
  const texts = [...body.matchAll(/>([^<]+)</g)].map(m => m[1]);
  const labels = [...body.matchAll(/\b(?:aria-label|title|alt|placeholder)="([^"]*)"/g)].map(m => m[1]);
  const title = html.match(/<title>([^<]*)<\/title>/)[1];
  const list = [...texts, ...labels, title].filter(text => CJK.test(text)).map(text => ['index.html', text]);
  assert.ok(list.length > 40, 'the page text was found');
  assert.deepEqual(untranslated(list), []);
});
