import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {PLAYER_MOVES,attackTravel,sampleFrames} from '../dist/attack-moves.js';
import {locomotionPose} from '../dist/locomotion3d.js';
import {CombatVFX} from '../dist/combat-vfx.js';
import {ArenaCombat} from '../dist/combat3d.js';
test('attack travel is conserved across frame rates and held until release',()=>{
 for(const m of Object.values(PLAYER_MOVES))for(const fps of [30,60,120]){let distance=0;for(let t=0;t<m.duration;t+=1/fps)distance+=attackTravel(m,t+1/fps)-attackTravel(m,t);assert.ok(Math.abs(distance-m.lungeSpeed*m.lungeUntil)<1e-8,m.id);assert.equal(attackTravel(m,m.travelStart??Math.max(0,m.impact-.14)),0);}
});
test('blade passes through contact without stopping at each keyframe',()=>{
 for(const id of ['diagonal','reverse','cleave','heavy']){const m=PLAYER_MOVES[id],h=1e-5,a=sampleFrames(m.frames,m.impact-h).rightArm,b=sampleFrames(m.frames,m.impact).rightArm,c=sampleFrames(m.frames,m.impact+h).rightArm;const before=a.map((v,i)=>(b[i]-v)/h),after=b.map((v,i)=>(c[i]-v)/h);assert.ok(Math.hypot(...before)>1,id);assert.ok(Math.hypot(...after.map((v,i)=>v-before[i]))<.1,id);}
});
test('gait differentiates retreat, lateral travel and sprint while remaining finite',()=>{
 const f=locomotionPose(3,1,0,0,1),b=locomotionPose(3,1,0,0,-1),l=locomotionPose(3,1,0,-1,0),r=locomotionPose(3,1,0,1,0),s=locomotionPose(6,1,0);assert.ok(f.rightLeg[0]>b.rightLeg[0]);assert.equal(l.body[2],-r.body[2]);assert.ok(s.chest[0]>f.chest[0]);for(let phase=0;phase<7;phase+=.1)assert.ok(Object.values(locomotionPose(6,phase,3,.6,.8,1)).flat().every(Number.isFinite));
});
test('combat effects have bounded pools, pause cleanly and clear on title/reset',()=>{
 const scene=new THREE.Scene(),fx=new CombatVFX(scene),g=new ArenaCombat(2),objects=scene.children.length;
 for(let i=0;i<200;i++){fx.emit({type:'execution-hit',heavy:true,target:'enemy'},g);fx.update(1/120,g,true);}assert.equal(scene.children.length,objects);assert.ok(fx.snapshot().smoke<=320);assert.ok(fx.snapshot().sparks<=192);assert.ok(fx.snapshot().rings<=6);assert.ok(fx.snapshot().sparks>0);
 const before=fx.snapshot();fx.update(0,g,true);assert.deepEqual(fx.snapshot(),before);for(const p of [fx.smoke,fx.sparks])assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));fx.update(.016,g,false);assert.deepEqual(fx.snapshot(),{smoke:0,sparks:0,rings:0});
});
test('crowd hit sparks originate from the struck enemy rather than the locked target',()=>{
 const scene=new THREE.Scene(),fx=new CombatVFX(scene),g=new ArenaCombat(0);g.enemies=[{...g.enemy,id:1,kindId:'wolf',x:-3,z:48},{...g.enemy,id:2,kindId:'ronin',x:4,z:24}];g.enemy=g.enemies[0];fx.emit({type:'hit',target:'enemy',enemyId:2,dirX:0,dirZ:0},g);const spark=fx.sparks.items.find(p=>p.life>0);assert.equal(spark.position.x,4);assert.equal(spark.position.z,24);assert.equal(spark.position.y,1.2);
});
