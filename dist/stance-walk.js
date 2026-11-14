import * as THREE from './vendor/three.module.js';

// A walk for a stance that only has a standing clip (the hero's guard): the upper body holds the
// stance, and the legs are solved so each foot stays where it lands while the body passes over it.
// The steps are worked out on the character's own skeleton, so nothing slides at the speed it was made for.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

// Where one foot is in its step at `u` (0-1 through the cycle, landing at 0).
// `along` is the ball of the foot's place on the line of travel as a fraction of the stride (+.5 ahead, -.5 behind),
// `up` its height as a fraction of the lift, `heel` how far the heel has peeled off the ground (0-1; below 0 the toes are up).
export function footStep(u, duty = .6) {
  u -= Math.floor(u);
  if (u < duty) {
    const s = u / duty;
    return { planted: true, along: .5 - s, up: 0, heel: s < .12 ? -.25 * (1 - s / .12) : s > .68 ? Math.pow((s - .68) / .32, 1.5) : 0 };
  }
  const w = (u - duty) / (1 - duty);
  return { planted: false, along: -.5 + smooth(w), up: Math.sin(Math.PI * Math.pow(w, .8)), heel: w < .7 ? 1 - 1.25 * smooth(w / .7) : -.25 };
}

// Two bones from `hip` reaching for `target`: bend the knee to the right length, then swing the thigh onto the line.
function reach(upper, lower, end, target) {
  const hip = upper.getWorldPosition(new THREE.Vector3()), knee = lower.getWorldPosition(new THREE.Vector3()), foot = end.getWorldPosition(new THREE.Vector3());
  const a = knee.distanceTo(hip), b = foot.distanceTo(knee), want = clamp(target.distanceTo(hip), Math.abs(a - b) * 1.02 + 1e-4, (a + b) * .998);
  const thigh = hip.clone().sub(knee).normalize(), shin = foot.clone().sub(knee).normalize();
  const axis = new THREE.Vector3().crossVectors(thigh, shin);
  if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0); axis.normalize();
  const now = Math.acos(clamp(thigh.dot(shin), -1, 1)), wanted = Math.acos(clamp((a * a + b * b - want * want) / (2 * a * b), -1, 1));
  turn(lower, new THREE.Quaternion().setFromAxisAngle(axis, wanted - now));
  end.getWorldPosition(foot);
  turn(upper, new THREE.Quaternion().setFromUnitVectors(foot.sub(hip).normalize(), target.clone().sub(hip).normalize()));
}
// Apply a world-space rotation to a bone.
function turn(bone, rotation) {
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()), world = bone.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(parent.invert().multiply(rotation.multiply(world)));
  bone.updateWorldMatrix(false, true);
}
function setWorldQuaternion(bone, world) {
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
  bone.updateWorldMatrix(false, true);
}

// Put the skeleton in the stance clip's pose at `at` seconds and remember it.
function freeze(model, stance, at) {
  const { scene } = model, mixer = new THREE.AnimationMixer(scene), action = mixer.clipAction(stance);
  action.play(); action.time = clamp(at, 0, stance.duration); mixer.update(0); scene.updateMatrixWorld(true);
  const held = model.skeleton.bones.map(b => ({ bone: b, position: b.position.clone(), quaternion: b.quaternion.clone() }));
  mixer.stopAllAction(); mixer.uncacheRoot(scene);
  const restore = () => { for (const h of held) { h.bone.position.copy(h.position); h.bone.quaternion.copy(h.quaternion); } scene.updateMatrixWorld(true); };
  restore();
  return { held, restore };
}

// The same walk from an authored clip: `steps` (a walk cycle, already pinned in place) drives the hips and legs,
// and everything above holds the stance. The walk turns and tips the hips with every step; `steady` (0-1) is how much
// of that the spine takes back out, so the guard keeps pointing where it did instead of swinging with the stride.
export function mixStanceWalk(model, stance, steps, { name = 'stancewalk', at = 0, steady = .85, drop = 0 } = {}) {
  const { hips } = model, lower = new Set([hips, ...model.legs.flatMap(leg => [leg.upper, leg.lower, leg.foot, ...(leg.foot?.children.filter(c => c.isBone) || [])])].filter(Boolean).map(b => b.name));
  // The bone the upper body hangs from: the hips' child that is not a leg (auto-rigs do not agree on which spine bone that is).
  const spine = hips?.children.find(c => c.isBone && !lower.has(c.name));
  if (!hips || !spine || lower.size < 7) return null;
  const { held } = freeze(model, stance, at), pose = Object.fromEntries(held.map(h => [h.bone.name, h]));
  const out = steps.tracks.filter(t => lower.has(t.name.slice(0, t.name.lastIndexOf('.')))).map(t => t.clone());
  const turning = steps.tracks.find(t => t.name === hips.name + '.quaternion');
  // A library walk can carry the body a little above the ground on this skeleton: `drop` (metres) sets it back down.
  const height = out.find(t => t.name === hips.name + '.position'), fall = drop / hips.parent.getWorldScale(new THREE.Vector3()).y;
  if (height && fall) for (let i = 1; i < height.values.length; i += 3) height.values[i] -= fall;
  for (const h of held) {
    if (lower.has(h.bone.name)) continue;
    out.push(new THREE.VectorKeyframeTrack(h.bone.name + '.position', [0, steps.duration], [...h.position.toArray(), ...h.position.toArray()]));
    if (h.bone !== spine || !turning) { out.push(new THREE.QuaternionKeyframeTrack(h.bone.name + '.quaternion', [0, steps.duration], [...h.quaternion.toArray(), ...h.quaternion.toArray()])); continue; }
    // Where the spine has to sit for the chest to stay as the stance had it, whatever the hips are doing.
    const values = [], q = new THREE.Quaternion(), level = pose[hips.name].quaternion.clone().multiply(h.quaternion);
    for (let i = 0; i < turning.times.length; i++) { q.fromArray(turning.values, i * 4).invert().multiply(level); values.push(...h.quaternion.clone().slerp(q, steady).toArray()); }
    for (let i = 4; i < values.length; i += 4) if (values[i] * values[i - 4] + values[i + 1] * values[i - 3] + values[i + 2] * values[i - 2] + values[i + 3] * values[i - 1] < 0) for (let k = 0; k < 4; k++) values[i + k] = -values[i + k];
    out.push(new THREE.QuaternionKeyframeTrack(h.bone.name + '.quaternion', [...turning.times], values));
  }
  return new THREE.AnimationClip(name, steps.duration, out);
}

// Bake the walk. `model` is a rigged character still standing at the origin facing +z; `stance` is the clip to hold,
// frozen at `at` seconds. `direction` is the line of travel in the character's frame ([0, 1] ahead, [1, 0] to its left).
// Played backwards the same clip walks the other way.
export function bakeStanceWalk(model, stance, { name = 'stancewalk', at = 0, direction = [0, 1], speed = 1.4, stride = .7, duty = .6, lift = .09, heel = .5, sink = .04, bob = .012, sway = .012, frames = 32 } = {}) {
  const { hips } = model, legs = model.legs.map((leg, i) => ({ ...leg, toe: leg.foot?.children.find(c => c.isBone) || null, phase: i * .5 }));
  if (!hips || legs.some(leg => !leg.upper || !leg.lower || !leg.foot)) return null;
  const { held, restore } = freeze(model, stance, at);

  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(direction[0], 0, direction[1]).normalize(), across = new THREE.Vector3().crossVectors(up, dir);
  const ahead = Math.abs(dir.z);
  const hipsWorld = hips.getWorldPosition(new THREE.Vector3());
  for (const leg of legs) {
    const joint = leg.upper.getWorldPosition(new THREE.Vector3()), ankle = leg.foot.getWorldPosition(new THREE.Vector3());
    leg.ball = leg.toe ? leg.toe.getWorldPosition(new THREE.Vector3()) : ankle.clone();
    leg.ankle = ankle.clone().sub(leg.ball); leg.flat = leg.foot.getWorldQuaternion(new THREE.Quaternion());
    // Each foot keeps its own lane (how far it stands to the side of the line of travel) and steps about a point under its hip.
    const lane = leg.ball.clone().sub(joint); lane.y = 0; lane.addScaledVector(dir, -lane.dot(dir));
    leg.centre = new THREE.Vector3(joint.x, leg.ball.y, joint.z).add(lane).sub(hipsWorld).setY(leg.ball.y);
  }
  const duration = stride / (speed * duty), times = [], tracks = new Map();
  const record = (bone, key, values) => { const id = bone.name + key; if (!tracks.has(id)) tracks.set(id, []); tracks.get(id).push(...values); };
  const moving = new Set([hips, ...legs.flatMap(leg => [leg.upper, leg.lower, leg.foot])]);
  for (let f = 0; f <= frames; f++) {
    const u = f / frames; times.push(u * duration); restore();
    // The body drops as the weight lands on both feet, rises over the standing leg and leans toward it.
    const body = hipsWorld.clone(); body.y += -sink - bob * Math.cos(4 * Math.PI * u); body.addScaledVector(across, sway * ahead * Math.sin(2 * Math.PI * (u + .1)));
    hips.position.copy(hips.parent.worldToLocal(body.clone())); hips.updateWorldMatrix(false, true);
    for (const leg of legs) {
      const step = footStep(u + leg.phase, duty), pitch = step.heel * heel * ahead;
      const ball = new THREE.Vector3(hipsWorld.x, 0, hipsWorld.z).add(leg.centre).addScaledVector(dir, step.along * stride); ball.y = leg.centre.y + step.up * lift;
      // Heel off the ground: the foot turns about its ball. Toes up before landing: it turns about the ankle.
      const roll = new THREE.Quaternion().setFromAxisAngle(across, pitch), ankle = leg.ankle.clone();
      if (pitch > 0) ankle.applyQuaternion(roll);
      reach(leg.upper, leg.lower, leg.foot, ball.add(ankle));
      setWorldQuaternion(leg.foot, roll.multiply(leg.flat));
    }
    record(hips, '.position', hips.position.toArray());
    for (const bone of moving) if (bone !== hips) record(bone, '.quaternion', bone.quaternion.toArray());
  }
  restore();
  const out = [];
  for (const [id, values] of tracks) {
    if (id.endsWith('.position')) { out.push(new THREE.VectorKeyframeTrack(id, times, values)); continue; }
    // Keep neighbouring keys on the same side of the sphere so they blend the short way round.
    for (let i = 4; i < values.length; i += 4) if (values[i] * values[i - 4] + values[i + 1] * values[i - 3] + values[i + 2] * values[i - 2] + values[i + 3] * values[i - 1] < 0) for (let k = 0; k < 4; k++) values[i + k] = -values[i + k];
    out.push(new THREE.QuaternionKeyframeTrack(id, times, values));
  }
  // Everything else holds the stance.
  const hold = value => [0, duration].flatMap(() => value.toArray());
  for (const h of held) {
    if (h.bone !== hips) out.push(new THREE.VectorKeyframeTrack(h.bone.name + '.position', [0, duration], hold(h.position)));
    if (!moving.has(h.bone) || h.bone === hips) out.push(new THREE.QuaternionKeyframeTrack(h.bone.name + '.quaternion', [0, duration], hold(h.quaternion)));
  }
  return new THREE.AnimationClip(name, duration, out);
}
