// The road up Borrowed-Name Mountain. Pure data and maths (no three.js): the simulation,
// the minimap and the scenery all read the same route. North is -z: the journey starts in the
// village at z = 334 and ends in the temple courtyard around the origin.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t * t * (3 - 2 * t);

export const JOURNEY = Object.freeze({ south: 340, north: -10, start: { x: 0, z: 334 }, courtyard: 11.8, courtyardFrom: 10 });

// Walkable edges at stations along the road, south to north: [z, west x, east x].
// Edges ease between stations; two stations a metre apart make a doorway or a bridge end.
export const STATIONS = Object.freeze([
  [340, -9, 9], [330, -11, 11], [318, -13, 12], [308, -9, 10],
  [301, -4.5, 4.5], [299, -4.5, 4.5],
  [294, -9, 3], [286, -14, -1], [280, -13, 5], [272, -7, 8],
  [267, -3, 7], [265, -3, 7],
  [260, 1, 13], [254, -6, 13], [248, -9, 11], [243, -5, 6],
  [241, -4, 5], [239, -4, 5],
  [232, -7, 11], [224, -11, 15], [214, -14, 15], [206, -12, 11], [200, -6, 6],
  [197, -4.5, 4.5], [195, -4.5, 4.5],
  [191, -8, 8], [187.5, -3.2, 3.2], [162.5, -3.2, 3.2], [160.5, -9.5, 9.5], [153, -9.5, 9.5],
  [151, -4.5, 4.5], [149, -4.5, 4.5],
  [142, -8, 4], [133, -3, 9], [124, -9, 5], [114, -5, 9], [108, -7, 7],
  [105, -4.5, 4.5], [103, -4.5, 4.5],
  [98, -12, 12], [84, -14.5, 14.5], [70, -13, 13], [65, -6, 6],
  [63, -4.5, 4.5], [61, -4.5, 4.5],
  [57, -10, 10], [19, -10, 10],
  [15.5, -4.5, 4.5], [12.5, -4.5, 4.5]
]);

// West and east walkable limits at depth z. North of the last station the road opens onto the round courtyard.
export function bounds(z) {
  z = clamp(z, JOURNEY.north, JOURNEY.south);
  const last = STATIONS.at(-1), yard = v => Math.sqrt(Math.max(0, JOURNEY.courtyard ** 2 - v * v));
  if (z <= JOURNEY.courtyardFrom) { const half = yard(z); return { min: -half, max: half }; }
  if (z <= last[0]) { const k = ease((last[0] - z) / (last[0] - JOURNEY.courtyardFrom)), half = yard(JOURNEY.courtyardFrom); return { min: last[1] + (-half - last[1]) * k, max: last[2] + (half - last[2]) * k }; }
  for (let i = 1; i < STATIONS.length; i++) {
    const a = STATIONS[i - 1], b = STATIONS[i];
    if (z >= b[0]) { const k = ease((a[0] - z) / (a[0] - b[0])); return { min: a[1] + (b[1] - a[1]) * k, max: a[2] + (b[2] - a[2]) * k }; }
  }
  return { min: last[1], max: last[2] };
}
export const centre = z => { const b = bounds(z); return (b.min + b.max) / 2; };
export const contains = (x, z, margin = 0) => { const b = bounds(z); return z >= JOURNEY.north && z <= JOURNEY.south && x >= b.min + margin && x <= b.max - margin; };

// Regions of the road, south to north. `mood` is what the air looks like there:
// fog colour and density, how hard it rains (0-1) and how much sky light gets in (1 = the courtyard's).
export const ZONES = Object.freeze([
  { id: 'village', name: '無名村', from: 340, to: 300, mood: { fog: '#33383a', density: .020, rain: .55, light: .95 } },
  { id: 'bamboo', name: '雨竹林', from: 300, to: 240, mood: { fog: '#1f3530', density: .027, rain: 1, light: .8 } },
  { id: 'steles', name: '千名碑林', from: 240, to: 196, mood: { fog: '#3a4347', density: .034, rain: .3, light: .85 } },
  { id: 'ravine', name: '斷魂橋', from: 196, to: 150, mood: { fog: '#1c2a38', density: .016, rain: .2, light: 1.1 } },
  { id: 'lanterns', name: '燃名香道', from: 150, to: 104, mood: { fog: '#3b2d26', density: .024, rain: .4, light: .75 } },
  { id: 'forecourt', name: '山門前庭', from: 104, to: 62, mood: { fog: '#27333b', density: .022, rain: .7, light: .9 } },
  { id: 'hall', name: '借名殿', from: 62, to: 14, mood: { fog: '#301f22', density: .030, rain: 0, light: .6 } },
  { id: 'temple', name: '鎮祟寺', from: 14, to: -10, mood: { fog: '#26373f', density: .022, rain: 1, light: 1 } }
]);
export const zoneAt = z => ZONES.find(zone => z <= zone.from && z > zone.to) || (z > ZONES[0].from ? ZONES[0] : ZONES.at(-1));

// Chapters in order. Every chapter but the last two ends at a gate across the road at depth `gate`,
// which opens when its foes are down. `groups` are where its foes stand: a group with `when.z`
// only appears once the hero has come that far north, one with `when.wave` once every foe so far is down.
// `harm` scales what foes deal (the early road is forgiving); `instant` chapters run into the next where they stand.
const group = (x, z, units, when = null) => ({ x, z, units, when });
export const STAGES = Object.freeze([
  { id: 'village', name: '村口狼嗥', zone: '無名村', gate: 300, gateName: '無 名 坊', harm: .5, goal: '擊退闖入村口的墨狼', onward: '穿過無名坊 · 入山尋人',
    groups: [group(0, 314, ['wolf', 'wolf', 'wolf'])] },
  { id: 'bamboo', name: '竹影狼襲', zone: '雨竹林', gate: 266, gateName: '聽 雨 關', harm: .55, goal: '擊散獵魂狼群，追查魂名去向', onward: '向林深處 · 追尋領狼的蹤跡',
    groups: [group(-5, 282, ['wolf', 'wolf', 'wolf', 'wolf']), group(-3, 277, ['mare', 'mare', 'wolf'], { wave: true })] },
  { id: 'alpha', name: '啣名狼王', zone: '雨竹林', gate: 240, gateName: '斷 竹 口', harm: .7, goal: '擊敗啣著名牌的狼王', onward: '出林向北 · 進千名碑林',
    groups: [group(2, 249, ['alpha', 'wolf', 'wolf']), group(1, 247, ['mare', 'mare'], { wave: true })] },
  { id: 'steles', name: '碑林劍影', zone: '千名碑林', gate: 196, gateName: '無 字 門', harm: .6, goal: '破開碑林中的劍影與抄名鬼吏', onward: '向斷魂橋 · 尋守橋人',
    groups: [group(2, 223, ['shade', 'shade', 'shade']), group(0, 206, ['scribe', 'scribe', 'shade', 'shade'], { z: 215 })] },
  { id: 'bridge', name: '斷橋守刃', zone: '斷魂橋', gate: 150, gateName: '斷 橋 關', harm: .8, goal: '過橋 · 擊敗守橋劍客沈寒舟', onward: '沿香道上山 · 燈火裡有人聲',
    groups: [group(0, 156, ['hanzhou', 'shade', 'shade'])] },
  { id: 'lanterns', name: '燃名香道', zone: '燃名香道', gate: 104, gateName: '照 魂 坊', harm: .65, goal: '斬斷燈奴身上的燃名咒', onward: '前往山門 · 兩尊護法已醒',
    groups: [group(-2, 138, ['thrall', 'thrall', 'thrall']), group(3, 119, ['mare', 'mare', 'mare', 'scribe'], { z: 127 }), group(1, 108, ['thrall', 'thrall', 'shade', 'shade'], { z: 114 })] },
  { id: 'forecourt', name: '泥塑護法', zone: '山門前庭', gate: 62, gateName: '鎮 祟 山 門', harm: .8, goal: '擊碎受驅使的石獸與泥塑護法', onward: '入山門 · 借名殿就在門後',
    groups: [group(0, 90, ['lion', 'lion']), group(0, 72, ['acolyte', 'acolyte'], { z: 83 })] },
  { id: 'hall', name: '借名殿', zone: '借名殿', gate: 14, gateName: '鎮 祟 門', harm: .7, goal: '闖過借名殿 · 契約在自衛', onward: '推開鎮祟門 · 向偽神討債',
    groups: [group(0, 49, ['scribe', 'scribe', 'shade', 'shade', 'shade']), group(0, 36, ['wolf', 'wolf', 'wolf', 'mare', 'mare'], { z: 40 }), group(0, 24, ['thrall', 'thrall', 'acolyte'], { z: 29 })] },
  { id: 'oni', name: '山門鎮祟', zone: '鎮祟寺', gate: -10, harm: 1, instant: true, goal: '擊敗偽神，毀去借名契', onward: '借名契已裂 · 祂還沒有倒下',
    groups: [group(0, 0, ['oni'])] },
  { id: 'nameless', name: '無名之主', zone: '鎮祟寺', gate: -10, harm: 1, final: true, goal: '斬斷祂吞下的每一個名字', onward: '借名契已破 · 眾魂得歸',
    groups: [group(0, -2, ['nameless'])] }
]);

// Things found off the road. A rubbing is a name the temple's scribe hid on the back of a stele
// (twelve in all, each a page of the journal); a shrine refills the hero's gourds once.
export const PICKUPS = Object.freeze([
  { id: 'r1', kind: 'rubbing', x: -11, z: 319 }, { id: 'r2', kind: 'rubbing', x: -12.2, z: 284 }, { id: 'r3', kind: 'rubbing', x: 11.5, z: 259 },
  { id: 'r4', kind: 'rubbing', x: -7.3, z: 249 }, { id: 'r5', kind: 'rubbing', x: 13.5, z: 221 }, { id: 'r6', kind: 'rubbing', x: -12, z: 211 },
  { id: 'r7', kind: 'rubbing', x: 6.3, z: 191 }, { id: 'r8', kind: 'rubbing', x: -8.2, z: 158 }, { id: 'r9', kind: 'rubbing', x: 7.6, z: 132 },
  { id: 'r10', kind: 'rubbing', x: -13, z: 85 }, { id: 'r11', kind: 'rubbing', x: 8.8, z: 44 }, { id: 'r12', kind: 'rubbing', x: -8.8, z: 24 },
  { id: 's1', kind: 'shrine', x: 5.6, z: 270 }, { id: 's2', kind: 'shrine', x: 8, z: 155.5 }, { id: 's3', kind: 'shrine', x: 11.5, z: 92 }
]);
export const RUBBINGS = PICKUPS.filter(p => p.kind === 'rubbing').length;
