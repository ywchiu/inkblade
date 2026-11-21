// The realms, in the order the hero reaches them. Each is a road of its own (its route, chapters and
// things to find), the master waiting at its end, and the power the hero takes from that master.
import { ROUTE, STAGES, PICKUPS } from './journey3d.js';

const realm = def => Object.freeze({ ...def, rubbingTotal: def.PICKUPS.filter(p => p.kind === 'rubbing').length });

export const REALMS = Object.freeze([
  realm({
    id: 'mountain', name: '借名山', blurb: '山神借走了村民的名字',
    ...ROUTE, STAGES, PICKUPS,
    boss: 'nameless', reward: 'callName',
    // The pages read after the master falls; the page for bringing back every hidden name goes in before the last.
    ending: ['ending', 'epilogue', 'soldNames', 'coda'], trueName: 'trueName'
  })
]);

export function realmById(id) {
  const found = REALMS.find(r => r.id === id);
  if (!found) throw new Error('unknown realm ' + id);
  return found;
}
