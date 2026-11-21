// How far the hero has come, kept in this browser: the realms cleared, the powers taken from their masters,
// and the realms whose every hidden name was brought back (each one adds to the hero's health).
// Without storage the game still plays; nothing is kept past the visit.
import { REALMS, realmById } from './realms.js';

export const PROGRESS_KEY = 'inkblade.progress.v1', VIGOR_STEP = 20;
// Each power's name and the key that calls it (the touch screen has a button of the same name).
export const POWER_INFO = Object.freeze({ callName: { name: '喚名', key: 'G' }, coldVoice: { name: '寒聲', key: 'V' } });
const POWERS = Object.keys(POWER_INFO);
const JOURNAL_KEY = 'inkblade.journal.v1', NAMES_KEY = 'inkblade.names.v1';
const REALM_IDS = REALMS.map(r => r.id);

function read(storage, key) { try { return JSON.parse(storage?.getItem(key) ?? 'null'); } catch { return null; } }
const known = (list, allowed) => new Set(Array.isArray(list) ? list.filter(id => allowed.includes(id)) : []);

export class Progress {
  constructor(storage = null) {
    this.storage = storage;
    let saved = null;
    try { saved = storage?.getItem(PROGRESS_KEY) ?? null; } catch {}
    const data = saved == null ? null : read(storage, PROGRESS_KEY);
    this.cleared = known(data?.cleared, REALM_IDS);
    this.powers = known(data?.powers, POWERS);
    this.complete = known(data?.complete, REALM_IDS);
    // Before progress was saved, a finished road showed only in the journal: its ending page, and every name brought back.
    if (saved == null) {
      const journal = read(storage, JOURNAL_KEY), names = read(storage, NAMES_KEY), mountain = REALMS[0];
      if (Array.isArray(journal) && journal.includes('ending')) { this.cleared.add(mountain.id); this.powers.add(mountain.reward); }
      if (Array.isArray(names) && names.length >= mountain.rubbingTotal) this.complete.add(mountain.id);
      this.save();
    }
  }
  // The first realm is always open; each one after it opens when the one before is cleared.
  unlocked() { return REALMS.filter((r, i) => i === 0 || this.cleared.has(REALMS[i - 1].id)); }
  vigor() { return this.complete.size * VIGOR_STEP; }
  // Returns the power newly taken from the realm's master, or null when the hero already had it.
  clear(realmId) {
    const realm = realmById(realmId), fresh = !this.powers.has(realm.reward);
    this.cleared.add(realm.id); this.powers.add(realm.reward); this.save();
    return fresh ? realm.reward : null;
  }
  completeSet(realmId) {
    const realm = realmById(realmId);
    if (this.complete.has(realm.id)) return false;
    this.complete.add(realm.id); this.save(); return true;
  }
  save() { try { this.storage?.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, cleared: [...this.cleared], powers: [...this.powers], complete: [...this.complete] })); } catch {} }
}

// What the results screen says was earned by clearing a realm: a new power, and the health that every hidden name brought back adds.
export function rewardLines({ power = null, vigor = false } = {}) {
  const lines = [];
  if (power) { const { name, key } = POWER_INFO[power]; lines.push(`得到本事：${name} · 按 ${key} 或「${name}」鈕`); }
  if (vigor) lines.push(`血量上限 +${VIGOR_STEP}`);
  return lines;
}

// The start screen's cards: one per open realm. A first-time player has only the first, shown as the journey card they know.
export function realmCards(progress) { return progress.unlocked().map((r, i) => ({ id: r.id, name: r.name, blurb: r.blurb, first: i === 0 })); }
