// The realms, in the order the hero reaches them. Each is a road of its own (its route, chapters and
// things to find), the master waiting at its end, and the power the hero takes from that master.
import { ROUTE, STAGES, PICKUPS } from './journey3d.js';
import { SNOW } from './snow-road.js';

const realm = def => Object.freeze({ ...def, rubbingTotal: def.PICKUPS.filter(p => p.kind === 'rubbing').length });

export const REALMS = Object.freeze([
  realm({
    id: 'mountain', name: '借名山', blurb: '山神借走了村民的名字',
    ...ROUTE, STAGES, PICKUPS,
    boss: 'nameless', reward: 'callName',
    // The pages read after the master falls. Whoever brought back every hidden name also reads the mountain's own name,
    // straight after the village wakes and before the talk turns to the names that were sold.
    ending: ['ending', 'epilogue', 'soldNames', 'coda'], trueName: 'trueName', trueNameAfter: 'epilogue',
    // The page that opens the road, what its hidden finds are called, and how a win is told on the results and the hint line.
    opening: 'opening', findName: '名拓', wonHint: '山門已破',
    victory: { title: '名字還給人間', text: '借名契已毀。受拘的魂魄各得歸處，無名狀上重新浮出字跡。' }
  }),
  realm({
    id: 'snow', name: '寒聲嶺', blurb: '有人把山谷裡的聲音凍了起來',
    ...SNOW,
    boss: 'crone', reward: 'coldVoice',
    ending: ['croneEnd', 'snowEpilogue', 'snowCoda'], trueName: 'snowTrueName', trueNameAfter: 'snowEpilogue',
    opening: 'snowOpening', findName: '冰聲', wonHint: '聲窟已靜',
    victory: { title: '聲音回到山谷', text: '冰鈴盡碎。被凍住的聲音，回到了每一個人的喉嚨裡。' }
  })
]);

export function realmById(id) {
  const found = REALMS.find(r => r.id === id);
  if (!found) throw new Error('unknown realm ' + id);
  return found;
}
