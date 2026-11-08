import test from 'node:test';import assert from 'node:assert/strict';
import {ArenaCombat,withinArc,distance} from '../dist/combat3d.js';
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.update(1/60,input);};
function close(g){g.player.x=0;g.player.z=2;g.player.yaw=Math.PI;g.enemy.x=0;g.enemy.z=0;g.enemy.state='recover';g.enemy.timer=10;}
test('3D attacks require both planar range and facing, not just X distance',()=>{const a={x:0,z:0,yaw:0};assert.ok(withinArc(a,{x:.4,z:2},3,1));assert.ok(!withinArc(a,{x:0,z:-2},3,1));assert.ok(!withinArc(a,{x:0,z:10},3,1));});
test('free movement traverses both X and Z and diagonal speed is normalized',()=>{const g=new ArenaCombat();g.enemy.timer=100;g.enemy.state='recover';const p={...g.player};tick(g,60,{x:1,z:-1});assert.ok(g.player.x>p.x&&g.player.z<p.z);assert.ok(Math.hypot(g.player.x-p.x,g.player.z-p.z)<=3.26);});
test('light attack spends stamina, damages only on impact and has recovery',()=>{const g=new ArenaCombat();close(g);assert.ok(g.action('light'));assert.equal(g.player.stamina,84);assert.equal(g.enemy.hp,310);assert.equal(g.action('roll'),false);tick(g,16);assert.equal(g.enemy.hp,289);tick(g,25);assert.equal(g.player.state,'idle');});
test('stamina gates actions and recovers only after its delay',()=>{const g=new ArenaCombat();g.player.stamina=15;assert.equal(g.action('light'),false);g.player.stamina=100;g.action('roll',1,0);tick(g,45);assert.equal(g.player.stamina,76);tick(g,60);assert.ok(g.player.stamina>76);});
test('roll moves directionally with finite invulnerability',()=>{const g=new ArenaCombat();g.action('roll',1,0);g.hitPlayer(30,g.enemy);assert.equal(g.player.hp,140);tick(g,37);assert.ok(Math.abs(g.player.x-3.2)<1e-6);g.hitPlayer(30,g.enemy);assert.equal(g.player.hp,110);});
test('frontal timed parry staggers; holding guard costs stamina',()=>{const g=new ArenaCombat();close(g);g.update(.016,{guard:true,lock:true});g.hitPlayer(23,g.enemy);assert.equal(g.player.hp,140);assert.equal(g.stats.parries,1);assert.equal(g.enemy.state,'stagger');const h=new ArenaCombat();close(h);tick(h,20,{guard:true,lock:true});h.hitPlayer(23,h.enemy);assert.equal(h.player.hp,137);assert.ok(h.player.stamina<100);});
test('ground slam ignores guard but can be evaded',()=>{const g=new ArenaCombat(2);close(g);g.update(.016,{guard:true});g.hitPlayer(31,g.enemy,true);assert.equal(g.player.hp,109);assert.equal(g.stats.parries,0);});
test('healing consumes a finite flask and can be interrupted',()=>{const g=new ArenaCombat();g.player.hp=70;g.action('heal');tick(g,65);assert.equal(g.player.hp,135);assert.equal(g.player.flasks,2);const h=new ArenaCombat();h.player.hp=70;h.action('heal');h.hitPlayer(20,h.enemy);tick(h,90);assert.equal(h.player.hp,50);assert.equal(h.player.flasks,2);});
test('heavy attacks break posture and create a punish window',()=>{const g=new ArenaCombat();close(g);g.enemy.posture=80;g.action('heavy');tick(g,32);assert.equal(g.enemy.hp,272);assert.equal(g.enemy.state,'stagger');assert.ok(g.enemy.stun>1);});
test('charged special consumes qi and damages in full 3D range',()=>{const g=new ArenaCombat();close(g);assert.equal(g.action('special'),false);g.player.qi=100;assert.ok(g.action('special'));tick(g,35);assert.equal(g.player.qi,0);assert.equal(g.enemy.hp,235);});
test('windup direction locks so sidestepping can avoid a strike',()=>{const g=new ArenaCombat();close(g);g.enemyBegin();tick(g,35);const yaw=g.enemy.yaw;g.player.x=4;tick(g,8);assert.equal(g.enemy.yaw,yaw);});
test('solid actors remain separated and cannot leave the circular arena',()=>{const g=new ArenaCombat();g.player.x=0;g.player.z=0;g.enemy.x=.1;g.enemy.z=0;g.update(.016);assert.ok(distance(g.player,g.enemy)>=1.049);g.player.x=30;g.update(.016);assert.ok(Math.hypot(g.player.x,g.player.z)<=11.31);});
test('all enemies have terminal victories; death and reset restore correct state',()=>{for(let i=0;i<3;i++){const g=new ArenaCombat(i);g.hitEnemy(999);assert.equal(g.status,'won');const time=g.time;tick(g,30);assert.equal(g.time,time);}const g=new ArenaCombat();g.hitPlayer(999,g.enemy);assert.equal(g.status,'lost');g.reset(2);assert.equal(g.status,'playing');assert.equal(g.player.flasks,3);assert.equal(g.enemy.hp,440);});
test('impact freezes both fighters briefly, then applies directional knockback without duplicate damage',()=>{
 const g=new ArenaCombat(2);close(g);g.player.state='heavy';g.hitEnemy(38,46);const hp=g.enemy.hp,z=g.enemy.z,timer=g.enemy.timer;
 assert.equal(g.hitStop,.105);assert.equal(g.enemy.impact.heavy,true);assert.ok(g.enemy.impact.dirZ<-.99);
 g.update(.05,{x:1});assert.equal(g.enemy.z,z);assert.equal(g.enemy.timer,timer);assert.equal(g.player.x,0);
 tick(g,20);assert.ok(g.enemy.z<z-.2);assert.equal(g.enemy.hp,hp);
});
test('ordinary hits visibly react without cancelling boss windup; heavy feedback exceeds light',()=>{
 const g=new ArenaCombat(2);close(g);g.enemyBegin();const total=g.enemy.total;g.hitEnemy(21,17);const light=g.enemy.impact.strength,stop=g.hitStop;
 assert.equal(g.enemy.state,'windup');assert.equal(g.enemy.total,total);assert.ok(g.enemy.impact.time>0);
 g.player.state='heavy';g.hitEnemy(38,46);assert.ok(g.enemy.impact.strength>light);assert.ok(g.hitStop>stop);assert.equal(g.enemy.state,'windup');
});
test('blocked chip damage is marked and does not trigger full hurt feedback; dodges and misses have no impact',()=>{
 const g=new ArenaCombat();close(g);tick(g,20,{guard:true,lock:true});g.hitPlayer(23,g.enemy);const ev=g.drainEvents();assert.equal(ev.find(e=>e.type==='hurt').blocked,true);assert.equal(g.player.impact.blocked,true);assert.ok(g.hitStop<.04);
 const h=new ArenaCombat();h.action('roll',1,0);h.hitPlayer(23,h.enemy);assert.equal(h.player.impact,null);assert.equal(h.hitStop,0);
 const m=new ArenaCombat();m.action('heavy');tick(m,35);assert.equal(m.enemy.impact,null);assert.equal(m.hitStop,0);
});
test('knockback respects arena bounds and reset clears impact state',()=>{
 const g=new ArenaCombat(2);g.player.x=11;g.player.z=0;g.enemy.x=8;g.enemy.z=0;g.hitPlayer(31,g.enemy,true);tick(g,50);assert.ok(Math.hypot(g.player.x,g.player.z)<=11.30001);g.reset(2);assert.equal(g.hitStop,0);assert.equal(g.player.impact,null);assert.equal(g.enemy.knockbackX,0);
});
