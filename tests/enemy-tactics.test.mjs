import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaCombat, distance } from '../dist/combat3d.js';
import { enemySequence } from '../dist/enemy-patterns.js';
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.update(1/120,input);};
const ranged=(index=1)=>{const g=new ArenaCombat(index);g.enemy.x=0;g.enemy.z=0;g.player.x=0;g.player.z=9;g.enemy.cooldown=0;g.enemyBegin();return g;};
const incoming=(g,extra={})=>{g.enemy.state='recover';g.enemy.timer=10;g.player.x=0;g.player.z=4;g.player.yaw=Math.PI;g.projectiles=[{id:1,x:0,z:2,yaw:0,speed:10,radius:.42,remaining:15,style:'blade',damage:22,unblockable:false,...extra}];};

test('ranged opponents respect cooldown and every opponent keeps finite recoveries',()=>{
 for(const id of ['wolf','ronin','oni']){
  const far=enemySequence(id,0,false,10,true);assert.equal(!!far[0].projectile,id!=='wolf');
  assert.ok(!enemySequence(id,0,false,10,false).some(m=>m.projectile));
  for(let cycle=0;cycle<6;cycle++)for(const d of [2,5,10])for(const enraged of [false,true]){
   const seq=enemySequence(id,cycle,enraged,d);assert.ok(seq.length<=3);assert.ok(seq.at(-1).recovery>=.9);assert.ok(seq.every(m=>m.windup>=.4));
  }
 }

 assert.equal(enemySequence('oni',0,true,10)[0].projectile.spread.length,2);
 assert.equal(enemySequence('ronin',0,false,10).length,2);
});
test('ranged attacks have startup and travel time, and a released shot does not home',()=>{
 const g=ranged();assert.equal(g.enemy.kind,'projectile');assert.equal(g.projectiles.length,0);tick(g,100);assert.equal(g.projectiles.length,0);assert.equal(g.player.hp,140);
 while(!g.projectiles.length)g.update(1/120);
 const shot=g.projectiles[0],yaw=shot.yaw;assert.equal(g.player.hp,140);g.player.x=4;tick(g,25);assert.equal(shot.yaw,yaw);assert.equal(shot.x,0);assert.equal(g.player.hp,140);
});
test('projectile swept collision hits once, including a fast shot crossing a whole frame',()=>{
 const g=new ArenaCombat();incoming(g,{speed:400});g.update(.05);assert.equal(g.player.hp,118);assert.equal(g.projectiles.length,0);tick(g,20);assert.equal(g.player.hp,118);
});
test('blade projectiles can be parried or blocked without remotely damaging the caster; fissures bypass guard',()=>{
 const g=new ArenaCombat();incoming(g,{z:3.1});g.update(.02,{guard:true,lock:true});assert.equal(g.player.hp,140);assert.equal(g.stats.parries,1);assert.equal(g.enemy.hp,310);assert.equal(g.enemy.state,'recover');assert.equal(g.projectiles.length,0);assert.ok(g.player.counterWindow>0);
 const b=new ArenaCombat();incoming(b,{z:3.1});b.player.state='guard';b.player.guardAge=.5;b.update(.02,{guard:true});assert.equal(b.player.hp,137);assert.equal(b.stats.parries,0);assert.ok(b.player.stamina<100);
 const f=new ArenaCombat(2);incoming(f,{z:3.1,unblockable:true,damage:32});f.update(.02,{guard:true});assert.equal(f.player.hp,108);assert.equal(f.stats.parries,0);
});
test('late lateral dodge earns a ranged counter during enemy recovery; early/far rolls do not',()=>{
 const g=new ArenaCombat();incoming(g);g.action('roll',1,0);tick(g,20);assert.equal(g.player.hp,140);assert.equal(g.stats.perfectDodges,1);assert.equal(g.projectiles.length,0);assert.ok(g.player.counterWindow>0);
 const early=new ArenaCombat();incoming(early,{z:-2});early.action('roll',1,0);tick(early,100);assert.equal(early.stats.perfectDodges,0);assert.equal(early.player.hp,140);
 const far=new ArenaCombat();incoming(far,{x:5});far.action('roll',-1,0);tick(far,25);assert.equal(far.stats.perfectDodges,0);
});
test('projectiles freeze in hit stop, expire by range, and reset or victory clears them',()=>{
 const g=new ArenaCombat();incoming(g);g.hitStop=.1;g.update(.05);assert.equal(g.projectiles[0].z,2);g.hitStop=0;g.projectiles[0].remaining=.1;g.update(.05);assert.equal(g.projectiles.length,0);
 incoming(g);g.hitEnemy(999);assert.equal(g.projectiles.length,0);g.reset();assert.equal(g.projectiles.length,0);assert.equal(g.enemy.rangedCooldown,0);
});
test('rush closes distance faster than ordinary pursuit, locks aim and can be sidestepped',()=>{
 for(const index of [0,1]){
  const g=new ArenaCombat(index);g.enemy.z=0;g.player.z=6;g.enemy.cycle=1;g.enemyBegin();const initial=distance(g.enemy,g.player);assert.ok(g.enemy.moveData.speed>g.spec.speed*2);
  while(g.enemy.state==='windup')g.update(1/120);
  const yaw=g.enemy.yaw;g.player.x=4;tick(g,100);assert.equal(g.enemy.yaw,yaw);assert.ok(distance({x:0,z:0},g.enemy)>initial*.8);assert.equal(g.player.hp,140);assert.equal(g.enemy.state,'recover');
 }
});
test('rush active contact window reaches a target beyond its initial hit frame',()=>{
 const g=new ArenaCombat(1);g.enemy.z=0;g.player.z=9;g.enemy.cycle=1;g.enemyBegin();while(g.enemy.state==='windup')g.update(1/120);tick(g,100);assert.ok(g.player.hp<140);assert.equal(g.stats.damageTaken,29);
});
test('long-range pursuit accelerates instead of walking forever during ranged cooldown',()=>{
 const g=new ArenaCombat(0);g.enemy.z=-10;g.player.z=10;g.enemy.rangedCooldown=5;g.enemy.cooldown=1;g.update(.05);const first=g.enemy.speed;tick(g,80);assert.ok(first<g.enemy.speed);assert.ok(g.enemy.speed>g.spec.speed*1.5);
});

test('guardian advancing claw actually reaches medium range before its delayed slam',()=>{
 const g=new ArenaCombat(2);g.enemy.z=0;g.player.z=6;g.enemyBegin();assert.equal(g.enemy.moveData.name,'踏步撕擊');while(g.enemy.state==='windup')g.update(1/120);tick(g,95);assert.equal(g.player.hp,113);assert.equal(g.enemy.moveData.name,'蓄勢重震');
});

test('wolves never select projectiles at any range or rage phase, and pursue until a pounce can reach',()=>{
 for(const enraged of [false,true])for(const ready of [false,true])for(let cycle=0;cycle<20;cycle++)for(const dist of [1,4,6,8,12,18,25]){
  const seq=enemySequence('wolf',cycle,enraged,dist,ready);assert.ok(seq.every(m=>!m.projectile&&['bite','pounce'].includes(m.kind)));
 }
 const g=new ArenaCombat(0);g.player.z=10;g.enemy.z=-5;g.enemy.cooldown=0;const before=g.enemy.z;g.update(.05);assert.equal(g.enemy.state,'idle');assert.ok(g.enemy.z>before);
 let swung=false;for(let i=0;i<120*25&&g.status==='playing';i++){g.update(1/120);assert.equal(g.projectiles.length,0);for(const e of g.drainEvents()){assert.notEqual(e.type,'projectile-release');if(e.type==='enemy-swing')swung=true;}}assert.ok(swung);
});
