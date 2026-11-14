// Which authored clip a combat actor should be playing. Pure data and logic:
// no three.js here, so the mapping is testable without a renderer.

// `speed` is the ground speed (m/s) the clip was authored at; playback rate is
// scaled from it so feet keep pace with the actor. Clips listed here must exist;
// states without a clip fall back down the candidate list to idle.
export const HERO_RIG = {
  rig: './assets/hero/rig2/hero.glb',
  height: 1.95,
  yaw: 0,
  weaponBone: 'RightHand',
  clips: {
    idle: { src: './assets/hero/rig2/idle.glb' },
    run: { src: './assets/hero/rig2/run.glb', speed: 3.2 },
    // `range` is the part of the clip (seconds) that the combat timer scrubs through:
    // library clips are 2-3 s with long settles, a light cut in the game lasts a fraction of that.
    light1: { src: './assets/hero/rig2/light1.glb', range: [.6, 1.7] },
    light2: { src: './assets/hero/rig2/light2.glb', range: [.45, 1.15] },
    light3: { src: './assets/hero/rig2/light3.glb', range: [.2, 1.4] },
    heavy: { src: './assets/hero/rig2/heavy.glb', range: [.25, 1.35] },
    dodge: { src: './assets/hero/rig2/dodge.glb', range: [.35, 1.5], inPlace: true },
    guard: { src: './assets/hero/rig2/guard.glb' },
    hurt: { src: './assets/hero/rig2/hurt.glb' },
    death: { src: './assets/hero/rig2/death.glb' },
    // The ultimate's own clips: sword thrust to the sky, and a leaping downward cut.
    shout: { src: './assets/hero/rig2/shout.glb', inPlace: true },
    judgment: { src: './assets/hero/rig2/judgment.glb', inPlace: true },
    // A spinning combo that ends on one knee with both hands driven at the ground: 敕令 · 鎮 uses that ending.
    plant: { src: './assets/hero/rig2/plant.glb', inPlace: true },
    // Turning cuts and overhead chops in place: the flurry inside the ultimate.
    flurry: { src: './assets/hero/rig2/flurry.glb', inPlace: true },
  },
  // A move built from several clips: each step scrubs `clip` over `range` until `to` seconds
  // into the move; the last step runs to the move's end. `hit` (clip time) lands at `at` (move time).
  // `tilt` turns the sword in the hand for that step (Euler, radians) where the library grip points it the wrong way.
  // `aim` points the blade along a direction in the character's own frame instead (x right, y up, z ahead).
  sequences: {
    // Blade across the face while ink gathers, then thrust to the sky; a flurry of turning cuts and chops
    // run at several times its authored speed; then a leap and a downward cut that lands on the last hit.
    spin: [{ to: .52, clip: 'guard', range: [.1, .6] }, { to: .9, clip: 'shout', range: [1.02, 1.55], tilt: [-1.4, 0, 0] }, { to: 1.4, clip: 'flurry', range: [.6, 3] }, { clip: 'judgment', range: [.62, 2.2], hit: 1.22, at: 1.75 }],
    // No clips were bought for the moves below: each is cut from the swings already in the library.
    // 雙燕迴翔: the level cut out to the left (light2), then the rising cut back to the right that closes light3.
    twin: [{ to: .3, clip: 'light2', range: [.42, .8], hit: .62, at: .2 }, { clip: 'light3', range: [1.36, 1.85], hit: 1.53, at: .44 }],
    // 崩山斷: blade to the sky (shout), then the downward half of light1.
    crash: [{ to: .2, clip: 'shout', range: [1, 1.25], tilt: [-1.4, 0, 0] }, { clip: 'light1', range: [1.2, 1.75], hit: 1.38, at: .36 }],
    // 躍淵斬: the judgment leap from its crouch, landing on the hit.
    leap: [{ clip: 'judgment', range: [.5, 1.75], hit: 1.15, at: .5 }],
    // 飛墨斬: out of the guard into the fast half of the heavy's level cut.
    inkWave: [{ to: .08, clip: 'guard', range: [.1, .3] }, { clip: 'heavy', range: [1.02, 1.5], hit: 1.22, at: .26 }],
    // 敕令 · 鎮: blade to the sky (shout), then the end of the plant clip: down onto one knee, the blade driven into the ground.
    seal: [{ to: .3, clip: 'shout', range: [.5, 1.25], tilt: [-1.4, 0, 0] }, { clip: 'plant', range: [2.2, 3.45], hit: 2.62, at: .55, aim: [0, -1, .35] }],
  },
};

// Enemies telegraph: `windup` scrubs the clip from range[0] to `hit`, `attack` from `hit`
// to range[1], so the blow lands when the game resolves it however long the windup is.
// `moves` maps an attack variant or kind to the clip that plays it.
export const RONIN_RIG = {
  rig: './assets/ronin/rig/ronin.glb',
  height: 2.05,
  yaw: 0,
  weaponBone: 'RightHand',
  flash: '#a76d35',
  moves: { 'slash-right': 'slashRight', 'slash-left': 'slashLeft', 'sword-cross': 'slashLeft', thrust: 'thrust', 'sword-wave': 'wave', projectile: 'wave', slash: 'slashRight' },
  clips: {
    idle: { src: './assets/ronin/rig/idle.glb' },
    run: { src: './assets/ronin/rig/run.glb', speed: 3.2 },
    slashRight: { src: './assets/ronin/rig/slashRight.glb', range: [.45, 1.15], hit: .8 },
    slashLeft: { src: './assets/ronin/rig/slashLeft.glb', range: [.6, 1.7], hit: 1.2 },
    thrust: { src: './assets/ronin/rig/thrust.glb', range: [.2, 1.4], hit: .75 },
    wave: { src: './assets/ronin/rig/wave.glb', range: [.25, 1.35], hit: .95 },
    hurt: { src: './assets/ronin/rig/hurt.glb' },
    death: { src: './assets/ronin/rig/death.glb' },
  },
};
export const ONI_RIG = {
  rig: './assets/monster/rig/oni.glb',
  height: 3.15,
  yaw: 0,
  type: 'oni',
  flash: '#a76d35',
  moves: { 'claw-right': 'clawRight', 'claw-left': 'clawLeft', rake: 'clawLeft', slam: 'slam', fissure: 'slam', slash: 'clawRight' },
  clips: {
    idle: { src: './assets/monster/rig/idle.glb' },
    walk: { src: './assets/monster/rig/walk.glb', speed: 1.5 },
    clawRight: { src: './assets/monster/rig/clawRight.glb', range: [.2, 1.1], hit: .72 },
    clawLeft: { src: './assets/monster/rig/clawLeft.glb', range: [.1, .9], hit: .45 },
    slam: { src: './assets/monster/rig/slam.glb', range: [.6, 1.87], hit: 1.35 },
    hurt: { src: './assets/monster/rig/hurt.glb' },
    death: { src: './assets/monster/rig/death.glb' },
  },
};
// The registry clerk wears its own body on the swordsman's skeleton (same auto-rig, same bone names),
// so it plays the swordsman's clips. It carries a judge's brush instead of a sword: 點名 is the thrust.
export const SCRIBE_RIG = { ...RONIN_RIG, rig: './assets/scribe/rig/scribe.glb', height: 2.1, moves: { ...RONIN_RIG.moves, 'sword-cross': 'thrust' } };
export const RIGS = { hero: HERO_RIG, ronin: RONIN_RIG, oni: ONI_RIG, scribe: SCRIBE_RIG };

const ATTACKS = new Set(['light', 'heavy', 'special']);
const TELEGRAPHED = new Set(['windup', 'attack']);
// The light chain's move ids and the clips that play them.
// Sequences above take precedence for the hero; these are the single-clip fallbacks.
const MOVE_CLIPS = { diagonal: 'light1', reverse: 'light2', cleave: 'light3', twin: 'light2', crash: 'heavy', leap: 'heavy', inkWave: 'light2', seal: 'heavy' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const progressOf = a => (a.total > 0 ? clamp(1 - a.timer / a.total, 0, 1) : 0);

// Ordered clip names for the actor's state, most specific first.
export function clipCandidates(actor, moves = {}) {
  const s = actor.state, speed = actor.speed || 0;
  if (TELEGRAPHED.has(s)) return [...new Set([moves[actor.variant], moves[actor.kind], actor.variant, actor.kind, 'attack'].filter(Boolean))];
  if (s === 'dead') return ['death'];
  if (s === 'stagger') return ['stagger', 'hurt'];
  if (s === 'hurt') return ['hurt', 'stagger'];
  if (s === 'roll') return ['dodge'];
  if (s === 'dash') return ['dash', 'dodge', 'sprint', 'run'];
  if (ATTACKS.has(s)) {
    const byState = s === 'heavy' ? 'heavy' : s === 'special' ? 'spin' : 'light' + ((((actor.chain || 1) - 1) % 3) + 1);
    const named = moves[actor.move] || MOVE_CLIPS[actor.move] || byState;
    return actor.move && actor.move !== named ? [actor.move, named] : [named];
  }
  if (s === 'heal') return ['heal'];
  if (s === 'guard') return speed > .05 ? ['guardwalk', 'guard'] : ['guard'];
  if (speed <= .05) return ['idle'];
  if (speed >= 4.5) return ['sprint', 'run', 'walk'];
  return speed >= 2 ? ['run', 'walk'] : ['walk', 'run'];
}

// mode: 'loop' plays at `rate`; 'scrub' is driven by `progress` so the clip
// stays locked to the combat timer (hit frames land when the game says so);
// 'once' plays through and holds its last frame.
export function pickClip(actor, clips, moves = {}, sequences = {}) {
  const has = name => Object.prototype.hasOwnProperty.call(clips, name);
  const steps = ATTACKS.has(actor.state) && sequences[actor.move];
  if (steps && steps.every(step => has(step.clip))) {
    const age = actor.total - actor.timer, index = steps.findIndex((step, i) => i === steps.length - 1 || age < step.to);
    const step = steps[index], from = index ? steps[index - 1].to : 0, to = step.to ?? actor.total, [start, end] = step.range;
    const pick = { name: step.clip, mode: 'scrub', progress: clamp((age - from) / (to - from), 0, 1), range: step.range, step: index, tilt: step.tilt, aim: step.aim, rate: 0, exact: true };
    if (step.hit != null) pick.time = age < step.at ? start + clamp((age - from) / (step.at - from), 0, 1) * (step.hit - start) : step.hit + clamp((age - step.at) / (to - step.at), 0, 1) * (end - step.hit);
    return pick;
  }
  const wanted = clipCandidates(actor, moves), name = wanted.find(has) || (has('idle') ? 'idle' : null);
  if (!name) return null;
  const s = actor.state, exact = name === wanted[0];
  if (wanted.includes(name) && TELEGRAPHED.has(s)) return { name, mode: 'scrub', progress: progressOf(actor), segment: s, rate: 0, exact };
  const timed = ATTACKS.has(s) || s === 'roll' || s === 'dash' || s === 'heal';
  if (wanted.includes(name) && timed && !['run', 'sprint'].includes(name)) return { name, mode: 'scrub', progress: progressOf(actor), rate: 0, exact };
  if (wanted.includes(name) && (s === 'dead' || s === 'stagger' || s === 'hurt')) return { name, mode: 'once', rate: 1, exact };
  const authored = clips[name].speed, speed = actor.speed || 0;
  const rate = authored && speed > .05 ? clamp(speed / authored, .6, 1.7) : 1;
  return { name, mode: 'loop', rate, exact };
}

// Where in the clip (seconds) a scrubbed pick sits.
export function scrubTime(info, duration, pick) {
  if (pick.time != null) return pick.time;
  const [from, to] = pick.range || info.range || [0, duration], hit = info.hit ?? from + (to - from) * .5;
  if (pick.segment === 'windup') return from + pick.progress * (hit - from);
  if (pick.segment === 'attack') return hit + pick.progress * (to - hit);
  return from + pick.progress * (to - from);
}
