import test from 'node:test';import assert from 'node:assert/strict';
import {ArenaCombat} from '../dist/combat3d.js';
import {PLAYER_MOVES,sampleFrames,sampleMonsterAttack} from '../dist/attack-moves.js';
const tick=(g,n)=>{for(let i=0;i<n;i++)g.update(1/120);};
const idle=g=>{for(let i=0;i<300&&g.player.state!=='idle';i++)g.update(1/120);assert.equal(g.player.state,'idle');};
function safe(){const g=new ArenaCombat(2);g.player.z=8;g.enemy.z=-8;g.enemy.state='recover';g.enemy.timer=100;return g;}
test('light chain chooses three distinct moves, buffers once at recovery, and charges on actual start',()=>{
 const g=safe();g.action('light');assert.equal(g.player.move,'diagonal');assert.equal(g.action('light'),false);tick(g,48);assert.equal(g.action('light'),true);assert.equal(g.player.stamina,84);g.action('light');tick(g,24);assert.equal(g.player.move,'reverse');assert.equal(g.player.chain,2);assert.equal(g.player.stamina,68);idle(g);g.action('light');assert.equal(g.player.move,'cleave');assert.equal(g.player.chain,3);idle(g);tick(g,90);g.action('light');assert.equal(g.player.move,'diagonal');
});
test('heavy resets the light chain and hurt clears queued follow-up',()=>{
 const g=safe();g.action('light');idle(g);g.action('heavy');assert.equal(g.player.move,'heavy');idle(g);g.action('light');assert.equal(g.player.chain,1);tick(g,48);g.action('light');assert.equal(g.player.queuedLight,true);g.hitPlayer(20,g.enemy);assert.equal(g.player.queuedLight,false);idle(g);assert.equal(g.player.move,'diagonal');
});
test('each move damages only at its shared animation impact time and only once',()=>{
 for(const move of Object.values(PLAYER_MOVES)){const g=new ArenaCombat(2);g.player.z=2;g.player.yaw=Math.PI;g.enemy.z=0;g.enemy.state='recover';g.enemy.timer=100;
  if(['reverse','cleave'].includes(move.id)){g.player.chain=move.id==='reverse'?1:2;g.player.chainWindow=1;}
  if(move.id==='riposte')g.player.counterWindow=1.4;if(move.id==='execute'){g.enemy.exposed=true;g.enemy.state='stagger';g.enemy.stun=2.6;}
  if(move.id==='dashCut'){g.action('dash');g.action('light');while(g.player.state==='dash')g.update(1/120);}
  if(['rising','sweep'].includes(move.id))g.startFinisher(move.id);
  g.player.qi=100;if(!['dashCut','rising','sweep'].includes(move.id))g.action(['heavy','riposte','execute'].includes(move.id)?'heavy':move.id==='spin'?'special':'light');
  while(g.player.actionAge+1/120<move.impact)g.update(1/120);assert.equal(g.enemy.hp,440,move.id+' before contact');
  tick(g,2);assert.equal(g.enemy.hp,440-move.damage,move.id+' at contact');idle(g);assert.equal(g.stats.hits,1,move.id+' one hit');
 }
});
test('full-body move curves are finite, distinct and use continuous keyframe boundaries',()=>{
 const signature=[];for(const move of Object.values(PLAYER_MOVES)){for(let t=0;t<move.duration;t+=.008){const pose=sampleFrames(move.frames,t);assert.ok(Object.values(pose).flat().every(Number.isFinite));}for(const [t]of move.frames.slice(1,-1)){const a=Object.values(sampleFrames(move.frames,t-1e-6)).flat(),b=Object.values(sampleFrames(move.frames,t+1e-6)).flat();assert.ok(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<.001);}if(!['riposte','execute'].includes(move.id))signature.push(sampleFrames(move.frames,move.impact-.09).rightArm);}
 for(let i=0;i<signature.length;i++)for(let j=i+1;j<signature.length;j++)assert.ok(Math.hypot(...signature[i].map((v,k)=>v-signature[j][k]))>.2);
});
test('mountain guardian cycles slam, right claw and left claw with different silhouettes',()=>{
 const g=safe(),variants=[];g.player.z=2;g.enemy.z=0;g.enemyBegin();variants.push(g.enemy.variant);g.enemyBegin();variants.push(g.enemy.variant);g.enemyBegin(true);variants.push(g.enemy.variant);assert.deepEqual(variants,['slam','claw-right','claw-left']);
 const right=sampleMonsterAttack({state:'windup',variant:'claw-right',total:1,timer:0}),left=sampleMonsterAttack({state:'windup',variant:'claw-left',total:1,timer:0});assert.ok(right.chest[1]*left.chest[1]<0);assert.ok(Math.abs(right.rightArm[2]-left.rightArm[2])>.5);
});
