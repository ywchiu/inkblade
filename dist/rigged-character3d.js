import * as THREE from './vendor/three.module.js';
import { pickClip, scrubTime } from './rig-clips.js';

// Authored skeletal animation: a rigged GLB plus one clip per GLB, played
// through AnimationMixer. Returns the same model shape the procedural rig in
// characters3d.js returns, so the world, trails and echoes need no changes.

const ROOT_MOTION = /^(hips|root|pelvis)\.position$/i;
const LOCOMOTION = new Set(['walk', 'run', 'sprint']);

// The game moves the actor itself, so the root's horizontal travel never comes
// from the clip. Locomotion and dodges are pinned in place; other clips keep
// their travel relative to the first frame (a lunge, a knock-back) but start on
// the actor, whatever offset the clip was authored at. Scale tracks are dropped:
// they only carry exporter noise and fight the normalized rig.
export function prepareClip(source, name, { inPlace = false } = {}) {
  const clip = source.clone();
  clip.name = name;
  clip.tracks = clip.tracks.filter(t => !t.name.endsWith('.scale'));
  for (const t of clip.tracks) {
    if (!ROOT_MOTION.test(t.name)) continue;
    const x = t.values[0], z = t.values[2];
    for (let i = 0; i < t.values.length; i += 3) { t.values[i] = inPlace ? 0 : t.values[i] - x; t.values[i + 2] = inPlace ? 0 : t.values[i + 2] - z; }
  }
  return clip;
}

export async function loadRiggedCharacter(manifest, { loader, createWeapon, kind = 'hero' } = {}) {
  const entries = Object.entries(manifest.clips);
  const [gltf, ...clipFiles] = await Promise.all([loader.loadAsync(manifest.rig), ...entries.map(([, c]) => loader.loadAsync(c.src))]);
  const clips = {};
  entries.forEach(([name], i) => { const found = clipFiles[i].animations[0]; if (found) clips[name] = prepareClip(found, name, { inPlace: !!(manifest.clips[name].speed || manifest.clips[name].inPlace) }); });
  return createRiggedCharacter(gltf, manifest, clips, { createWeapon, kind });
}

export function createRiggedCharacter(gltf, manifest, clips, { createWeapon, kind = 'hero' } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(), scene = gltf.scene;
  root.add(body); body.add(scene);
  const meshes = [], bones = {};
  let skeleton = null;
  scene.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    o.material = o.material.clone(); o.material.envMapIntensity = .7; o.material.roughness = Math.max(.65, o.material.roughness ?? 1);
    if (o.material.map) o.material.map.anisotropy = 4;
    meshes.push(o); if (o.isSkinnedMesh) skeleton = o.skeleton;
  });
  if (!skeleton) throw new Error('rigged character has no skinned mesh: ' + manifest.rig);
  // Fit to the game's height with feet on the ground, facing +Z.
  scene.rotation.y = manifest.yaw || 0; scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene), scale = manifest.height / (box.max.y - box.min.y), center = box.getCenter(new THREE.Vector3());
  scene.scale.multiplyScalar(scale); scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale); root.updateMatrixWorld(true);

  const bone = (...names) => names.map(n => bones[n]).find(Boolean) || null;
  const side = s => ({ upper: bone(s + 'Arm'), lower: bone(s + 'ForeArm'), hand: bone(s + 'Hand') });
  const leg = s => ({ upper: bone(s + 'UpLeg'), lower: bone(s + 'Leg'), foot: bone(s + 'Foot') });
  const arms = [side('Right'), side('Left')], legs = [leg('Right'), leg('Left')];
  let weapon = null;
  const hand = bone(manifest.weaponBone || 'RightHand');
  if (createWeapon && hand) {
    weapon = createWeapon();
    // Fit the grip in the bind pose (arms down, thumbs forward): the hilt sits in the palm,
    // the blade leaves the thumb side pointing forward and its edge follows the knuckles.
    // Skeleton.pose() writes root bones in world space, ignoring the armature above them, so keep theirs.
    const roots = skeleton.bones.filter(b => !b.parent?.isBone).map(b => [b, b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
    skeleton.pose(); for (const [b, p, r, k] of roots) { b.position.copy(p); b.quaternion.copy(r); b.scale.copy(k); }
    root.updateMatrixWorld(true);
    const grip = manifest.weapon || {}, wrist = hand.getWorldPosition(new THREE.Vector3()), elbow = (arms[0].lower || hand.parent).getWorldPosition(new THREE.Vector3());
    const along = wrist.clone().sub(elbow).normalize(), up = new THREE.Vector3(0, 0, -1);
    const edge = along.clone().addScaledVector(up, -along.dot(up)).normalize(), flat = new THREE.Vector3().crossVectors(edge, up);
    const world = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(edge, up, flat));
    if (grip.roll) world.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), grip.roll));
    // Auto-rig bones often carry a unit scale (centimetres); cancel it so the sword keeps its real size.
    const s = hand.getWorldScale(new THREE.Vector3());
    weapon.scale.set(1 / s.x, 1 / s.y, 1 / s.z);
    weapon.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
    weapon.position.copy(hand.worldToLocal(wrist.addScaledVector(along, (grip.palm ?? .045) * manifest.height)));
    hand.add(weapon); weapon.userData.rest = weapon.quaternion.clone();
  }
  const clipInfo = Object.fromEntries(Object.keys(clips).map(n => [n, manifest.clips[n] || {}]));
  return attachMixer({ root, body, scene, hips: bone('Hips'), spine: bone('Spine', 'Spine01'), torso: bone('Spine02', 'Spine01', 'Spine'), head: bone('Head'), arms, legs, skeleton, meshes, weapon, height: manifest.height, type: manifest.type || 'human', kind, generated: true, rigged: true, asset: manifest.rig, clips, clipInfo, moves: manifest.moves || {}, sequences: manifest.sequences || {}, flashColor: manifest.flash || '#9e2415' });
}

// Playback state is per instance: a cloned fighter shares clips but needs its own mixer.
export function attachMixer(m) {
  m.mixer = new THREE.AnimationMixer(m.scene); m.actions = {};
  for (const [name, clip] of Object.entries(m.clips)) m.actions[name] = m.mixer.clipAction(clip);
  return Object.assign(m, { current: null, missing: new Set(), phase: 0, deathProgress: 0, moveYaw: 0, tilt: new THREE.Vector3(), lastMotion: null, lastAnimationTime: undefined });
}

function switchTo(m, pick) {
  const next = m.actions[pick.name], previous = m.current && m.actions[m.current.name];
  next.reset(); next.enabled = true; next.setEffectiveWeight(1);
  if (pick.mode === 'once') { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; } else { next.setLoop(THREE.LoopRepeat, Infinity); next.clampWhenFinished = false; }
  next.play();
  // Timed moves snap in fast so the first frames of a swing are not blended away.
  const fade = pick.mode === 'scrub' ? .07 : pick.mode === 'once' ? .09 : .18;
  if (previous && previous !== next) { if (m.snap) previous.stop(); else previous.crossFadeTo(next, fade, false); }
  m.current = { name: pick.name, mode: pick.mode, key: pick.key };
}

export function animateRigged(m, a, t, dt) {
  const rewound = m.lastAnimationTime !== undefined && t < m.lastAnimationTime; m.lastAnimationTime = t;
  m.root.position.set(a.x, 0, a.z); m.root.rotation.y = a.state === 'roll' ? a.dodgeYaw ?? a.yaw : a.yaw;
  const pick = pickClip(a, m.clipInfo, m.moves, m.sequences);
  if (pick) {
    if (!pick.exact) m.missing.add(a.state === 'guard' || a.state === 'idle' ? a.state : a.move || a.state);
    // Scrubbed clips follow the combat timer, so only one-shot reactions need restarting per hit.
    pick.key = pick.name + ':' + (pick.segment ? 'telegraph' : a.state) + ':' + (pick.mode === 'once' && a.state !== 'dead' ? a.impact?.id ?? '' : '');
    m.snap = rewound || !m.current;
    if (!m.current || m.current.key !== pick.key) switchTo(m, pick);
    const action = m.actions[pick.name];
    if (pick.mode === 'scrub') { action.timeScale = 0; action.time = scrubTime(m.clipInfo[pick.name], action.getClip().duration, pick); } else action.timeScale = pick.rate;
  }
  // The actor keeps facing its target while moving, and there is one run clip. Turn the body
  // into the direction of travel so strafing and backing off read as running that way,
  // and swing back to the target for anything that is not plain locomotion.
  const last = m.lastMotion; m.lastMotion = { x: a.x, z: a.z };
  if (rewound || !last) m.moveYaw = 0;
  else if (dt > 0) {
    const vx = (a.x - last.x) / dt, vz = (a.z - last.z) / dt, travelling = pick?.mode === 'loop' && LOCOMOTION.has(pick.name) && Math.hypot(vx, vz) > .4;
    const want = travelling ? Math.atan2(vx, vz) - m.root.rotation.y : 0, delta = Math.atan2(Math.sin(want - m.moveYaw), Math.cos(want - m.moveYaw));
    m.moveYaw += delta * (1 - Math.exp(-dt * (travelling ? 12 : 18)));
  }
  // A step can turn the sword in the hand (a raised blade pointing at the sky instead of along the knuckles).
  if (m.weapon?.userData.rest) {
    const want = pick?.tilt || [0, 0, 0]; if (rewound) m.tilt.set(0, 0, 0); else m.tilt.lerp(new THREE.Vector3(...want), 1 - Math.exp(-Math.max(0, dt) * 14));
    // A cloned fighter's userData went through JSON: its rest pose arrives as a plain array.
    const rest = m.weaponRest ??= m.weapon.userData.rest.isQuaternion ? m.weapon.userData.rest : new THREE.Quaternion().fromArray(m.weapon.userData.rest);
    m.weapon.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(m.tilt.x, m.tilt.y, m.tilt.z)));
  }
  m.body.rotation.y = m.moveYaw || 0;
  m.mixer.update(Math.max(0, dt));
  // A step can instead aim the blade along a direction in the character's own frame (x right, y up, z ahead):
  // a sword driven into the ground stays in the ground whatever the wrist of the clip is doing.
  if (pick?.aim) m.aimDirection = pick.aim;
  m.aim = rewound ? 0 : THREE.MathUtils.lerp(m.aim || 0, pick?.aim ? 1 : 0, 1 - Math.exp(-Math.max(0, dt) * 16));
  if (m.aim > .001 && m.aimDirection && m.weaponRest) {
    const hand = m.weapon.parent.getWorldQuaternion(new THREE.Quaternion()), world = hand.clone().multiply(m.weapon.quaternion);
    const blade = new THREE.Vector3(0, -1, 0).applyQuaternion(world), target = new THREE.Vector3(...m.aimDirection).normalize().applyQuaternion(m.root.quaternion);
    m.weapon.quaternion.slerp(hand.invert().multiply(new THREE.Quaternion().setFromUnitVectors(blade, target).multiply(world)), Math.min(1, m.aim));
  }
  // Until a death clip exists, keep the old topple so a kill still reads.
  if (a.state === 'dead' && m.current?.name !== 'death') { m.deathProgress = Math.min(1, m.deathProgress + dt * 2.5); m.body.rotation.z = m.deathProgress * 1.42; m.body.position.y = m.deathProgress * .18; }
  else { m.deathProgress = 0; m.body.rotation.z = 0; m.body.position.set(0, 0, 0); }
  const impact = a.impact;
  if (impact?.time > 0 && a.state !== 'dead' && a.state !== 'roll') {
    const force = impact.strength * Math.pow(impact.time / impact.total, 1.7);
    const lx = impact.dirX * Math.cos(a.yaw) - impact.dirZ * Math.sin(a.yaw), lz = impact.dirX * Math.sin(a.yaw) + impact.dirZ * Math.cos(a.yaw);
    m.body.position.x += lx * .11 * force; m.body.position.z += lz * .11 * force; m.body.position.y -= .07 * force;
  }
  for (const mesh of m.meshes) { mesh.material.emissive?.set(a.flash > 0 ? m.flashColor : '#000000'); mesh.material.emissiveIntensity = a.flash > 0 ? .22 * Math.min(1, a.flash / .12) : 0; }
}
