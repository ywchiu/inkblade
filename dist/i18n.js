// Language switch. The game is written in Chinese; English is laid over it where text reaches the page,
// so the simulation, the story data and the tests keep one source of truth. Lettering inside the 3D world
// (gate plaques, steles, seals) is part of the scenery and stays as painted.
import { EN, EN_PATTERNS } from './lang-en.js';

const CJK = /[㐀-鿿]/, STORE = 'inkblade.lang', LANGS = ['zh', 'en'];
const ATTRIBUTES = ['aria-label', 'title', 'alt', 'placeholder'];
// A heading set with a space between every character: 彈 反, 鎮 祟 寺 · 雨 夜.
const SPACED = /^(?:[\u3400-\u9fff·] )+[\u3400-\u9fff·]$/;
export const misses = new Set();

// One string into English. Tried in order: the whole string; the string with its numbers lifted out
// ("墨氣 45 / 100" is looked up as "墨氣 # / #"); a spaced heading closed up ("彈 反" as "彈反", set in capitals);
// a pattern that carries a name or a key through; and last, the pieces between " ｜ " and " · " one by one.
const cache = new Map();
export function toEnglish(text) {
  if (!CJK.test(text)) return text;
  if (cache.has(text)) return cache.get(text);
  const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0], core = text.slice(lead.length, text.length - tail.length);
  const found = whole(core) ?? pieces(core, ' ｜ ', ' | ') ?? pieces(core, ' · ', ' · ');
  const out = lead + (found ?? core) + tail;
  if (found == null || (CJK.test(found) && found !== core)) misses.add(core);
  cache.set(text, out);
  return out;
}
function whole(core) {
  if (Object.hasOwn(EN, core)) return EN[core];
  const numbers = [], shape = core.replace(/\d+(?:\.\d+)?/g, n => (numbers.push(n), '#'));
  if (numbers.length && Object.hasOwn(EN, shape)) { let i = 0; return EN[shape].replace(/#/g, () => numbers[i++] ?? ''); }
  if (SPACED.test(core)) { const closed = core.replace(/ /g, '').replace(/·/g, ' · '), inner = whole(closed) ?? pieces(closed, ' · ', ' · '); if (inner != null) return inner.toUpperCase(); }
  for (const [pattern, build] of EN_PATTERNS) { const m = core.match(pattern); if (m) return build(m, part => whole(part) ?? part); }
  return null;
}
// Split on a separator and translate each piece, keeping together any run of pieces that has a translation of its own
// (a move called "敕令 · 鎮" inside "長按 · 敕令 · 鎮").
function pieces(core, separator, joiner) {
  const parts = core.split(separator);
  if (parts.length < 2) return null;
  const out = []; let hit = false;
  for (let i = 0; i < parts.length;) {
    let taken = 0, value = null;
    for (let n = Math.min(parts.length - i, parts.length - 1); n >= 1 && value == null; n--) {
      const piece = parts.slice(i, i + n).join(separator).trim(); taken = n;
      if (!CJK.test(piece)) value = n === 1 ? piece : null;
      else { value = whole(piece) ?? (separator === ' ｜ ' && n === 1 ? pieces(piece, ' · ', ' · ') : null); if (value != null) hit = true; }
    }
    if (value == null) { out.push(parts[i].trim()); taken = 1; } else out.push(value);
    i += taken;
  }
  return hit ? out.join(joiner) : null;
}

const pick = value => (LANGS.includes(value) ? value : null);
function initial() {
  if (typeof location === 'undefined') return 'zh';
  let saved = null; try { saved = localStorage.getItem(STORE); } catch {}
  return pick(new URLSearchParams(location.search).get('lang')) || pick(saved) || (/^zh\b/i.test(navigator.language || 'zh') ? 'zh' : 'en');
}
let lang = initial();
export const getLang = () => lang;
export const t = text => (lang === 'en' ? toEnglish(String(text)) : text);

// The page: every text node and labelled attribute remembers its Chinese, and shows the current language.
const source = new WeakMap(), shown = new WeakMap(), attrs = new WeakMap();
// Scripts, styles and anything marked translate="no" (the language button's own label) are left alone.
const skipped = el => !el || el.closest?.('script,style,[translate="no"]');
function paintText(node) {
  if (skipped(node.parentElement)) return;
  const value = node.nodeValue;
  if (lang === 'zh' && !source.has(node)) return;
  if (shown.get(node) !== value) source.set(node, value);
  const original = source.get(node), next = lang === 'en' ? toEnglish(original) : original;
  shown.set(node, next);
  if (next !== value) node.nodeValue = next;
}
function paintAttributes(el) {
  if (skipped(el)) return;
  for (const name of ATTRIBUTES) {
    if (!el.hasAttribute(name)) continue;
    const value = el.getAttribute(name), known = attrs.get(el) || {};
    if (known[name]?.shown !== value) known[name] = { source: value };
    const next = lang === 'en' ? toEnglish(known[name].source) : known[name].source;
    known[name].shown = next; attrs.set(el, known);
    if (next !== value) el.setAttribute(name, next);
  }
}
function paint(root) {
  if (root.nodeType === 3) { paintText(root); return; }
  if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
  paintAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) { if (node.nodeType === 3) paintText(node); else paintAttributes(node); }
}
let observer = null;
export function setLang(next) {
  if (!pick(next)) return lang;
  lang = next; try { localStorage.setItem(STORE, lang); } catch {}
  apply(); return lang;
}
function apply() {
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  const title = document.querySelector('title');
  if (title) { title.dataset.zh ??= title.textContent; document.title = lang === 'en' ? toEnglish(title.dataset.zh) : title.dataset.zh; }
  paint(document.body);
  document.dispatchEvent(new CustomEvent('inkblade-lang', { detail: lang }));
}
// Start following the page: whatever the game writes from here on is shown in the current language before it is drawn.
export function followPage() {
  if (observer) return;
  observer = new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') paintText(r.target);
      else if (r.type === 'attributes') paintAttributes(r.target);
      else for (const node of r.addedNodes) paint(node);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
  apply();
}
