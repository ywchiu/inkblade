// The road up the Frost-Voice Ridge (寒聲嶺). Pure data, read the same way as the mountain's: north is -z, the hero
// starts in the mute village at z = 184 and the road ends in the bell cave, a round hollow around the origin.
import { makeRoute } from './journey3d.js';

const JOURNEY = Object.freeze({ south: 190, north: -10, start: { x: 0, z: 184 }, courtyard: 13.5, courtyardFrom: 11.5 });

// Walkable edges, south to north: [z, west x, east x]. Two stations two metres apart make a gate's doorway.
const STATIONS = Object.freeze([
  [190, -9, 9], [180, -11, 10], [170, -12, 12], [160, -10, 9], [155, -5, 5],
  [153, -4.5, 4.5], [151, -4.5, 4.5],
  [146, -7, 6], [138, -9, 8], [128, -8, 10], [118, -10, 7], [110, -6, 6],
  [108, -4.5, 4.5], [106, -4.5, 4.5],
  [100, -10, 10], [90, -14, 14], [78, -15, 15], [66, -12, 12], [60, -6, 6],
  [58, -4.5, 4.5], [56, -4.5, 4.5],
  [50, -9, 9], [40, -11, 11], [30, -9, 9], [22, -6, 6], [17, -4.5, 4.5],
  [15.5, -4.5, 4.5], [13.5, -4.5, 4.5]
]);

// `mood` is what the air looks like there: fog colour and density, how hard it snows (0-1), how much light gets in.
const ZONES = Object.freeze([
  { id: 'hush', name: '啞村', from: 190, to: 150, mood: { fog: '#9aa6ae', density: .018, snow: .5, light: 1.05 } },
  { id: 'slope', name: '風雪坡道', from: 150, to: 105, mood: { fog: '#8d9aa5', density: .03, snow: 1, light: .9 } },
  { id: 'lake', name: '冰湖', from: 105, to: 55, mood: { fog: '#a7b6bf', density: .016, snow: .3, light: 1.1 } },
  { id: 'cavemouth', name: '聲窟前', from: 55, to: 14, mood: { fog: '#6f7e89', density: .026, snow: .7, light: .8 } },
  { id: 'cave', name: '聲窟', from: 14, to: -10, mood: { fog: '#3a4a58', density: .03, snow: 0, light: .55 } }
]);

// The bells in the cave. Each holds one person's voice; calling that person's name beside it breaks it.
const BELLS = Object.freeze([
  { id: 'b1', x: -9.5, z: 3, name: '老周', text: '村長。每天天亮前敲梆子報時，敲了三十年。' },
  { id: 'b2', x: 9.5, z: 3, name: '石生', text: '過山的貨郎。腰上的名牌還在坡上，聲音卻掛在這裡。' },
  { id: 'b3', x: -6, z: -8.5, name: '秋娘', text: '阿聆的娘。上山要替女兒把聲音買回來，自己的也賠了進去。' },
  { id: 'b4', x: 6, z: -8.5, name: '阿聆', text: '畫狀紙的啞女。她的聲音，是這口鈴裡最年輕的一個。' }
]);

const group = (x, z, units, when = null) => ({ x, z, units, when });
const STAGES = Object.freeze([
  { id: 'hush', name: '啞村狐影', zone: '啞村', gate: 152, gateName: '啞 村 口', harm: .6, goal: '擊退從雪裡竄出的冰狐', onward: '出村上坡 · 去找阿聆的娘',
    groups: [group(0, 166, ['fox', 'fox', 'fox']), group(0, 156, ['fox', 'fox'], { z: 160 })] },
  { id: 'slope', name: '坡上凍客', zone: '風雪坡道', gate: 107, gateName: '風 口 關', harm: .7, goal: '放倒擋路的凍旅人', onward: '下坡向冰湖 · 湖底有人聲',
    groups: [group(1, 138, ['traveller', 'traveller']), group(0, 124, ['fox', 'fox', 'traveller'], { wave: true })] },
  { id: 'lake', name: '冰湖吼風', zone: '冰湖', gate: 57, gateName: '冰 湖 渡', harm: .8, goal: '渡過冰湖 · 擊退吼風山魈', onward: '沿湖向北 · 聲窟就在前面',
    groups: [group(0, 90, ['traveller', 'traveller', 'fox', 'fox']), group(0, 68, ['howler', 'fox', 'fox'], { z: 76 })] },
  { id: 'cavemouth', name: '聲窟門前', zone: '聲窟前', gate: 14.5, gateName: '聲 窟 門', harm: .85, goal: '清開聲窟門前的守衛', onward: '入聲窟 · 鈴聲在等名字',
    groups: [group(0, 38, ['traveller', 'traveller', 'traveller', 'fox', 'fox']), group(0, 30, ['fox', 'fox', 'fox'], { wave: true })] },
  { id: 'crone', name: '凍聲婆', zone: '聲窟', gate: -10, harm: 1, final: true, goal: '叫碎冰鈴 · 擊倒凍聲婆', onward: '冰鈴盡碎 · 聲音回到山谷',
    bells: BELLS, groups: [group(0, -2, ['crone'])] }
]);

// Six voices frozen into icicles along the road (each a page of the journal), and two shrines that refill the gourds.
const PICKUPS = Object.freeze([
  { id: 'v1', kind: 'rubbing', x: -9, z: 176 }, { id: 'v2', kind: 'rubbing', x: 7.5, z: 162 }, { id: 'v3', kind: 'rubbing', x: -7, z: 135 },
  { id: 'v4', kind: 'rubbing', x: 11, z: 84 }, { id: 'v5', kind: 'rubbing', x: -12.5, z: 72 }, { id: 'v6', kind: 'rubbing', x: 8, z: 42 },
  { id: 'ss1', kind: 'shrine', x: 6, z: 128 }, { id: 'ss2', kind: 'shrine', x: 9, z: 74 }
]);

export const SNOW = Object.freeze({ ...makeRoute({ journey: JOURNEY, stations: STATIONS, zones: ZONES }), STAGES, PICKUPS, BELLS });
