import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaCombat } from '../dist/combat3d.js';
import { DODGE, dodgeTravel, dodgePose } from '../dist/dodge3d.js';
function safe(){const g=new ArenaCombat(2);g.enemy.x=0;g.enemy.z=-9;g.enemy.state='recover';g.enemy.timer=100;return g;}
function finish(g,dt){for(let i=0;i<200&&g.player.state==='roll';i++)g.update(dt);}
test('left, right, diagonal and default backstep preserve facing and equal travel across simulation rates',()=>{
 for(const dt of [1/120,1/60,1/30])for(const [x,z]of [[-1,0],[1,0],[1,-1],[0,0]]){const g=safe(),start={...g.player};assert.ok(g.action('roll',x,z));const dir={x:g.player.rollX,z:g.player.rollZ};finish(g,dt);assert.ok(Math.abs(Math.hypot(g.player.x-start.x,g.player.z-start.z)-DODGE.distance)<1e-6);assert.equal(g.player.yaw,start.yaw);assert.equal(g.player.stamina,76);assert.equal(g.player.state,'idle');assert.ok((g.player.x-start.x)*dir.x+(g.player.z-start.z)*dir.z>0);if(x===0&&z===0)assert.ok(dir.z>.99);}
});
test('dodge protection expires before recovery and cannot be chained or cancel attacks',()=>{
 const g=safe();g.action('roll',1,0);assert.equal(g.action('roll',-1,0),false);assert.equal(g.action('heavy'),false);g.hitPlayer(31,g.enemy,true);assert.equal(g.player.hp,140);for(let i=0;i<20;i++)g.update(1/60);assert.equal(g.player.state,'roll');assert.equal(g.player.invulnerable,0);g.hitPlayer(31,g.enemy,true);assert.equal(g.player.hp,109);assert.equal(g.player.state,'hurt');
 const h=safe();h.action('light');assert.equal(h.action('roll',1,0),false);const k=safe();k.player.stamina=23;assert.equal(k.action('roll',1,0),false);
});
test('evasion curves stay upright, mirror lateral lean and settle without residual travel',()=>{
 let previous=0;for(let t=0;t<=.6;t+=.005){const d=dodgeTravel(t);assert.ok(d>=previous&&d<=DODGE.distance);previous=d;for(const side of[-1,1]){const p=dodgePose({yaw:0,rollX:side,rollZ:0,total:DODGE.duration,timer:DODGE.duration-t});assert.ok(Object.values(p).flat().every(Number.isFinite));assert.ok(Math.abs(p.body[0])<.25&&Math.abs(p.body[2])<.3);}}
 const a=dodgePose({yaw:0,rollX:1,rollZ:0,total:.5,timer:.35}),b=dodgePose({yaw:0,rollX:-1,rollZ:0,total:.5,timer:.35});assert.equal(a.body[2],-b.body[2]);assert.equal(dodgeTravel(.45),dodgeTravel(.5));
});
