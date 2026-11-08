import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaCombat,distance} from '../dist/combat3d.js';
import {guardianSequence} from '../dist/enemy-patterns.js';
const tick=(g,n)=>{for(let i=0;i<n;i++)g.update(1/120);};
function close(){const g=new ArenaCombat(2);g.player.z=2.4;g.enemy.z=0;g.enemy.state='recover';g.enemy.timer=100;return g;}
function incoming(g){Object.assign(g.enemy,{state:'attack',kind:'slash',moveData:null,total:.48,timer:.31,attackHit:false,yaw:0});}
test('precision dodge earns one counter window per dodge only for a nearby incoming attack',()=>{
 const g=close();incoming(g);g.action('roll',1,0);tick(g,3);assert.equal(g.player.hp,140);assert.equal(g.stats.perfectDodges,1);assert.equal(g.player.stamina,90);assert.equal(g.player.qi,15);assert.ok(g.player.counterWindow>1.3);g.rewardDodge();assert.equal(g.stats.perfectDodges,1);
 const safe=close();safe.player.x=7;incoming(safe);safe.action('roll',1,0);tick(safe,3);assert.equal(safe.stats.perfectDodges,0);
 const early=close();early.action('roll',1,0);tick(early,30);incoming(early);tick(early,3);assert.equal(early.stats.perfectDodges,0);
 const special=close();special.player.qi=100;special.action('special');incoming(special);tick(special,3);assert.equal(special.stats.perfectDodges,0);
});
test('a buffered K after a perfect dodge launches one affordable counter and consumes its opportunity',()=>{
 const g=close();incoming(g);g.action('roll',1,0);tick(g,3);assert.ok(g.action('heavy'));tick(g,65);assert.equal(g.player.move,'riposte');assert.equal(g.stats.counters,1);assert.equal(g.enemy.hp,388);assert.equal(g.player.counterWindow,0);assert.equal(g.player.stamina,72);tick(g,100);assert.equal(g.stats.counters,1);
});
test('posture break gives a finite, range-gated single execution that resets with the match',()=>{
 const g=close();g.enemy.posture=140;g.hitEnemy(21,17);assert.ok(g.enemy.exposed);assert.ok(g.canExecute());tick(g,15);g.player.stamina=0;assert.ok(g.action('heavy'));assert.equal(g.player.move,'execute');assert.equal(g.enemy.exposed,false);tick(g,120);assert.equal(g.stats.executions,1);assert.equal(g.enemy.hp,309);assert.equal(g.player.stamina,0);tick(g,30);g.player.stamina=0;assert.equal(g.action('heavy'),false);g.reset(2);assert.equal(g.stats.executions,0);assert.equal(g.enemy.exposed,false);
 const far=close();far.enemy.exposed=true;far.enemy.state='stagger';far.player.x=8;assert.equal(far.canExecute(),false);far.action('heavy');assert.equal(far.player.move,'heavy');
 const expiry=close();expiry.enemy.posture=140;expiry.hitEnemy(21,17);tick(expiry,340);assert.equal(expiry.enemy.exposed,false);
});
test('light recovery can evade and preserve the combo, while early startup and heavy commitment cannot',()=>{
 const g=close();g.action('light');assert.equal(g.action('roll',1,0),false);tick(g,49);assert.ok(g.action('roll',1,0));assert.equal(g.player.state,'roll');tick(g,70);g.action('light');assert.equal(g.player.chain,2);
 const h=close();h.action('heavy');tick(h,50);assert.equal(h.action('roll',1,0),false);
});
test('guardian has single, double, delayed and distance-closing patterns with finite recovery and phase two',()=>{
 assert.deepEqual(guardianSequence(0,false,2).map(m=>m.variant),['slam']);assert.deepEqual(guardianSequence(1,false,2).map(m=>m.variant),['claw-right','claw-left']);const delayed=guardianSequence(2,false,2);assert.ok(delayed[1].windup>delayed[0].windup);assert.ok(guardianSequence(0,false,5)[0].advance>0);assert.equal(guardianSequence(0,true,2).length,3);
 const g=close();g.enemy.cycle=1;g.enemyBegin();const seen=new Set();for(let i=0;i<600;i++){g.update(1/120);seen.add(g.enemy.variant);if(g.enemy.state==='recover')break;}assert.ok(seen.has('claw-right')&&seen.has('claw-left'));assert.equal(g.enemy.state,'recover');assert.ok(g.enemy.timer>1);
});
test('posture recovery waits and slows as enemy health drops',()=>{
 const a=close(),b=close();for(const g of[a,b]){g.enemy.posture=60;g.enemy.postureDelay=.5;}b.enemy.hp=110;tick(a,50);tick(b,50);assert.equal(a.enemy.posture,60);tick(a,120);tick(b,120);assert.ok(a.enemy.posture<b.enemy.posture);
});
test('K just after precision hit-stop is buffered before the dodge counter transition',()=>{
 const g=close();incoming(g);g.action('roll',1,0);tick(g,3);while(g.hitStop>0||g.player.actionAge<.14)g.update(1/120);assert.ok(g.player.actionAge<.18);assert.ok(g.action('heavy'));assert.ok(g.player.inputBuffer);tick(g,60);assert.equal(g.stats.counters,1);assert.equal(g.player.move,'riposte');
});
