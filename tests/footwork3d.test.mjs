import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {solveLeg,applyFootwork} from '../dist/footwork3d.js';
import {transitionPose} from '../dist/motion-transition3d.js';
function rig(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);const upper=new THREE.Bone(),lower=new THREE.Bone(),foot=new THREE.Bone();upper.position.set(0,1,0);lower.position.set(0,-.5,0);foot.position.set(0,-.5,0);body.add(upper);upper.add(lower);lower.add(foot);root.updateMatrixWorld(true);return {root,body,leg:{upper,lower,foot}};}
test('two-bone IK reaches ground targets under rotated parents without stretching or backward knees',()=>{
 for(const yaw of [0,.7,2.5]){const {root,body,leg}=rig();root.rotation.y=yaw;body.rotation.z=.1;root.updateMatrixWorld(true);const target=new THREE.Vector3(.12,.1,.23).applyAxisAngle(new THREE.Vector3(0,1,0),yaw),pole=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));solveLeg(leg,target,pole);const hip=leg.upper.getWorldPosition(new THREE.Vector3()),knee=leg.lower.getWorldPosition(new THREE.Vector3()),ankle=leg.foot.getWorldPosition(new THREE.Vector3());assert.ok(ankle.distanceTo(target)<1e-6);assert.ok(Math.abs(hip.distanceTo(knee)-.5)<1e-6);assert.ok(Math.abs(knee.distanceTo(ankle)-.5)<1e-6);assert.ok(knee.clone().sub(hip).dot(pole)>0);}
});
test('unreachable foot targets clamp to bone length and remain finite',()=>{const {leg}=rig();solveLeg(leg,new THREE.Vector3(0,-10,0),new THREE.Vector3(0,0,1));const p=leg.foot.getWorldPosition(new THREE.Vector3());assert.ok(p.toArray().every(Number.isFinite));assert.ok(p.y>0);});
test('transition holds outgoing pose at entry, converges before contact and lets fresh recoil through',()=>{
 const bone=new THREE.Bone(),model={body:new THREE.Group()},pose=()=>new Map([[bone,[0,0,0]]]);transitionPose(model,{state:'idle'},pose(),.016);bone.rotation.x=-1;const entry=pose();transitionPose(model,{state:'heavy',move:'heavy'},entry,0);assert.equal(entry.get(bone)[0],-1);const contact=pose();transitionPose(model,{state:'heavy',move:'heavy'},contact,.13);assert.equal(contact.get(bone)[0],0);const recoil=new Map([[bone,[.8,0,0]]]);transitionPose(model,{state:'hurt'},recoil,0,true);assert.equal(recoil.get(bone)[0],.8);
});
test('grounding never overrides dodge, recoil or death and pause preserves anchors',()=>{
 const {root,body,leg}=rig(),m={root,body,legs:[leg],height:2,type:'human',phase:0};const actor={x:0,z:0,yaw:0,state:'idle',speed:0};applyFootwork(m,actor,.016);const old=m.footwork;applyFootwork(m,actor,0);assert.equal(m.footwork,old);for(const state of ['roll','dead','hurt','stagger']){m.footwork=old;applyFootwork(m,{...actor,state},.016);assert.equal(m.footwork,null);}
});
