import * as THREE from './vendor/three.module.js';
const clamp=THREE.MathUtils.clamp;
const ease=t=>t*t*(3-2*t);
function aim(bone,child,point){
 const origin=bone.getWorldPosition(new THREE.Vector3()),direction=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),desired=point.clone().sub(origin).normalize();
 const world=bone.getWorldQuaternion(new THREE.Quaternion()),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
 const delta=new THREE.Quaternion().setFromUnitVectors(direction,desired);
 bone.quaternion.copy(parent.invert().multiply(delta.multiply(world)));bone.updateWorldMatrix(false,true);
}
// Analytic two-bone solve: preserve segment lengths and bend knees toward the pole.
export function solveLeg(leg,target,pole){
 const hip=leg.upper.getWorldPosition(new THREE.Vector3()),knee=leg.lower.getWorldPosition(new THREE.Vector3()),ankle=leg.foot.getWorldPosition(new THREE.Vector3());
 const upper=hip.distanceTo(knee),lower=knee.distanceTo(ankle),axis=target.clone().sub(hip),distance=clamp(axis.length(),Math.abs(upper-lower)+.001,upper+lower-.001);if(axis.lengthSq()<1e-10)axis.set(0,-1,0);else axis.normalize();
 const bend=pole.clone().addScaledVector(axis,-pole.dot(axis));if(bend.lengthSq()<1e-8)bend.set(1,0,0).addScaledVector(axis,-axis.x);bend.normalize();
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const kneeTarget=hip.clone().addScaledVector(axis,along).addScaledVector(bend,height),reachable=hip.clone().addScaledVector(axis,distance);
 aim(leg.upper,leg.lower,kneeTarget);aim(leg.lower,leg.foot,reachable);return reachable;
}
export function resetFootwork(model){model.footwork=null;}
export function applyFootwork(m,a,dt){
 if(m.type==='wolf')return;
 if(dt<=0)return;
 if(['dead','roll','dash','stagger','hurt'].includes(a.state)||a.impact?.time>0){m.footwork=null;return;}
 m.root.updateMatrixWorld(true);
 const walking=['idle','guard'].includes(a.state)&&(a.speed||0)>.2,mode=walking?'walk':['idle','guard','heal'].includes(a.state)?'stand':'action';
 const yaw=m.root.rotation.y,forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 let f=m.footwork;const moved=f?Math.hypot(a.x-f.x,a.z-f.z):0,turn=f?Math.atan2(Math.sin(yaw-f.yaw),Math.cos(yaw-f.yaw)):0;
 if(!f||f.mode!==mode||moved>1||Math.abs(turn)>.45){f=m.footwork={mode,x:a.x,z:a.z,yaw,feet:m.legs.map(l=>({anchor:l.foot.getWorldPosition(new THREE.Vector3()),swing:false,from:null}))};}
 const direction=new THREE.Vector3(a.x-f.x,0,a.z-f.z);if(direction.lengthSq()>1e-7)direction.normalize();else direction.copy(f.direction||forward);f.direction=direction.clone();
 // Rest ankle height preserves the source mesh sole clearance on the flat arena.
 const plans=[];
 for(let i=0;i<m.legs.length;i++){
  const leg=m.legs[i],state=f.feet[i],current=leg.foot.getWorldPosition(new THREE.Vector3()),target=current.clone(),ground=m.soleClearance?.[i]??m.height*.065;
  if(mode==='walk'){
   const phase=((m.phase/(Math.PI*2)+i*.5)%1+1)%1,stance=.56,swing=phase>=stance;
   const nominal=new THREE.Vector3(a.x,ground,a.z).addScaledVector(right,(i?1:-1)*m.height*.14),landing=nominal.addScaledVector(direction,.36);
   if(swing){if(!state.swing)state.from=state.anchor.clone();const u=(phase-stance)/(1-stance);target.copy(state.from||current).lerp(landing,ease(u));target.y=ground+Math.sin(Math.PI*u)*m.height*.09;state.last=target.clone();}
   else{if(state.swing)state.anchor.copy(state.last||landing);state.anchor.y=ground;target.copy(state.anchor);}
   state.swing=swing;
  }else if(mode==='stand'){
   // Turn in place by releasing an overextended planted foot, not twisting its knee.
   if(Math.abs(turn)>.025||state.anchor.distanceTo(current)>m.height*.28)state.anchor.lerp(current,1-Math.exp(-dt*12));
   target.copy(state.anchor);target.y=ground;
  }else target.y=ground; // Keep authored combat stance; correct only ground contact.
  plans.push({leg,state,target});
 }
 // Lower the pelvis just enough for planted feet to remain reachable.
 let drop=0;for(const {leg,target} of plans){const hip=leg.upper.getWorldPosition(new THREE.Vector3()),knee=leg.lower.getWorldPosition(new THREE.Vector3()),ankle=leg.foot.getWorldPosition(new THREE.Vector3()),reach=(hip.distanceTo(knee)+knee.distanceTo(ankle))*.995,horizontal=Math.hypot(target.x-hip.x,target.z-hip.z),vertical=Math.sqrt(Math.max(.01,reach*reach-horizontal*horizontal));drop=Math.max(drop,hip.y-target.y-vertical);}
 m.body.position.y-=Math.min(m.height*.14,Math.max(0,drop));m.root.updateMatrixWorld(true);
 for(const {leg,state,target} of plans){
  solveLeg(leg,target,forward);
  const parent=leg.foot.parent.getWorldQuaternion(new THREE.Quaternion()),flat=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
  leg.foot.quaternion.copy(parent.invert().multiply(flat));leg.foot.updateWorldMatrix(false,true);
  state.error=leg.foot.getWorldPosition(new THREE.Vector3()).distanceTo(target);state.target=target;
 }
 f.x=a.x;f.z=a.z;f.yaw=yaw;
}
