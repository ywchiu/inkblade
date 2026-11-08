import { cloneFighter } from '../dist/campaign-world3d.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import { GLTFLoader } from '../dist/vendor/addons/loaders/GLTFLoader.js';
import { PLAYER_MOVES } from '../dist/attack-moves.js';
import { createCharacter, animateCharacter } from '../dist/characters3d.js';
// Node has no image decoder. Geometry/skin tests use texture placeholders;
// actual texture decoding, rendering and deformation are checked in-browser.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:4096,height:4096,close(){}});
for(const [kind,path] of [['hero','hero/demon-queller.glb'],['oni','monster/temple-guardian.glb'],['ronin','ronin/faceless-swordsman.glb'],['wolf','wolf/ink-wolf.glb']]){
 test(`${kind}: actual GLB bind pose, normalized weights, finite combat deformation`,async()=>{
  const bytes=await readFile(new URL('../dist/assets/'+path,import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const model=createCharacter(gltf,kind);model.root.updateMatrixWorld(true);model.skeleton.update();
  const boneCount=kind==='wolf'?20:kind==='oni'?16:23;assert.equal(model.skeleton.bones.length,boneCount);if(kind==='wolf'){assert.equal(model.legs.length,4);assert.equal(model.weapon,undefined);}if(kind==='ronin')assert.equal(model.weapon.parent,model.arms[0].hand);
  const vertex=new THREE.Vector3(),rest=new THREE.Vector3();
  for(const mesh of model.meshes){
   const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
   mesh.geometry.computeBoundingBox();assert.ok(Math.abs(mesh.geometry.boundingBox.max.y-model.height)<1e-5);assert.ok(Math.abs(mesh.geometry.boundingBox.min.y)<1e-5);
   for(let i=0;i<position.count;i++){
    let sum=0;for(let k=0;k<4;k++){const w=skinWeight.array[i*4+k];assert.ok(Number.isFinite(w)&&w>=0&&w<=1);assert.ok(skinIndex.array[i*4+k]<boneCount);sum+=w;}assert.ok(Math.abs(sum-1)<1e-5);
    if(i%73===0){rest.fromBufferAttribute(position,i);mesh.getVertexPosition(i,vertex);assert.ok(rest.distanceTo(vertex)<1e-5,'bind pose must preserve the original mesh');}
   }
  }
  if(kind==='hero'||kind==='ronin'){
   const hand=model.arms[0].hand,handFamily=new Set([hand,...Object.values(model.arms[0].grip)].map(b=>model.skeleton.bones.indexOf(b))),pivot=hand.getWorldPosition(new THREE.Vector3());let checked=0;
   hand.rotation.x=.5;model.root.updateMatrixWorld(true);model.skeleton.update();
   for(const mesh of model.meshes){const {position,skinIndex,skinWeight}=mesh.geometry.attributes;for(let i=0;i<position.count;i++){let familyWeight=0;for(let k=0;k<4;k++)if(handFamily.has(skinIndex.array[i*4+k]))familyWeight+=skinWeight.array[i*4+k];if(familyWeight<.99999)continue;rest.fromBufferAttribute(position,i).sub(pivot).applyAxisAngle(new THREE.Vector3(1,0,0),.5).add(pivot);mesh.getVertexPosition(i,vertex);assert.ok(rest.distanceTo(vertex)<1e-5,'distal hand must rotate with sword wrist');checked++;}}
   assert.ok(checked>10,'actual hand vertices inherit the wrist through hand and finger bones');hand.rotation.x=0;model.root.updateMatrixWorld(true);model.skeleton.update();
  }
  if(kind==='hero'||kind==='ronin'){
   model.phase=0;let maxError=0;
   for(let i=0;i<240;i++){const t=i/60,actor={x:0,z:t*2.2,yaw:0,speed:2.2,state:'idle',total:0,timer:0,flash:0};animateCharacter(model,actor,t,1/60);for(const f of model.footwork.feet)maxError=Math.max(maxError,f.error);}
   assert.ok(maxError<.005,'actual rig keeps foot targets reachable through gait: '+maxError);
   const heldBody=model.body.position.clone(),heldBones=model.skeleton.bones.map(b=>b.quaternion.clone());animateCharacter(model,{x:0,z:239/60*2.2,yaw:0,speed:2.2,state:'idle',total:0,timer:0,flash:0},239/60,0);assert.ok(model.body.position.distanceTo(heldBody)<1e-9,'pause retains IK pelvis correction');model.skeleton.bones.forEach((b,i)=>assert.ok(b.quaternion.angleTo(heldBones[i])<1e-6,'pause holds planted pose'));
   model.footwork=null;model.motionTransition=null;
  }
  const hitActor={x:0,z:0,yaw:0,speed:0,state:'idle',total:0,timer:0,flash:.18,impact:{id:101,time:.48,total:.48,strength:1,dirX:1,dirZ:0,heavy:true}};
  animateCharacter(model,hitActor,0,0);assert.ok(model.torso.rotation.z<-.3,'first impact must visibly recoil even during a zero-dt hit stop');
  const frozen=model.torso.quaternion.clone();animateCharacter(model,hitActor,0,0);assert.ok(frozen.angleTo(model.torso.quaternion)<1e-6,'hit stop must hold the impact pose');
  const copy=cloneFighter(model);assert.notEqual(copy.skeleton,model.skeleton);assert.equal(copy.meshes[0].geometry,model.meshes[0].geometry);assert.notEqual(copy.meshes[0].material,model.meshes[0].material);const sourcePose=model.skeleton.bones.map(b=>b.quaternion.clone());animateCharacter(copy,{x:4,z:48,yaw:1,state:'idle',speed:3,total:0,timer:0,flash:0},1,1/60);model.skeleton.bones.forEach((b,i)=>assert.ok(b.quaternion.angleTo(sourcePose[i])<1e-6,'crowd bones must be independent'));assert.equal(copy.root.position.z,48);
  const scenarios=['idle','guard','heal','hurt','stagger','dead'].map(state=>({state,total:1}));
  if(kind==='hero')scenarios.push({state:'dash',dashYaw:Math.PI,total:.38});
  if(kind==='hero')for(const [rollX,rollZ]of[[-1,0],[1,0],[0,-1],[0,1]])scenarios.push({state:'roll',rollX,rollZ,total:.5});
  if(kind==='hero')for(const move of Object.values(PLAYER_MOVES))scenarios.push({state:['heavy','rising','sweep','riposte','execute'].includes(move.id)?'heavy':move.id==='spin'?'special':'light',move:move.id,total:move.duration});
  else for(const variant of kind==='ronin'?['slash-right','slash-left','thrust','sword-wave','sword-cross']:kind==='wolf'?['pounce','bite','rake','howl']:['slam','claw-right','claw-left','fissure'])for(const state of ['windup','attack'])scenarios.push({state,kind:['sword-wave','sword-cross','howl','fissure'].includes(variant)?'projectile':variant==='rake'?'bite':variant,variant,total:state==='windup'?1.12:.48});
  for(const scenario of scenarios){const {state,total}=scenario;
   for(let frame=0;frame<=60;frame++){
    animateCharacter(model,{x:0,z:0,yaw:0,speed:state==='idle'?3:0,rollX:0,rollZ:1,...scenario,timer:total*(1-frame/60),flash:0},frame/60,1/60);
    model.root.updateMatrixWorld(true);model.skeleton.update();
    if(frame%10!==0)continue;
    for(const mesh of model.meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i+=113){mesh.getVertexPosition(i,vertex).applyMatrix4(mesh.matrixWorld);assert.ok(vertex.toArray().every(Number.isFinite),state+' finite vertices');assert.ok(vertex.length()<model.height*2.5,state+' bounded deformation');}
   }
  }
 });
}
