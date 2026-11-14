import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNEY,STATIONS,ZONES,STAGES,PICKUPS,RUBBINGS,bounds,centre,contains,zoneAt} from '../dist/journey3d.js';
import {CampaignCombat,CHAPTERS,ROLES} from '../dist/campaign3d.js';
import {roleSequence,enemySequence} from '../dist/enemy-patterns.js';
import {drawBattleMap} from '../dist/battle-map.js';

const at=id=>{const g=new CampaignCombat();g.stage=CHAPTERS.findIndex(c=>c.id===id);g.spawnStage();g.drainEvents();return g;};
const run=(g,seconds,input={})=>{for(let t=0;t<seconds;t+=1/60){g.hitStop=0;g.update(1/60,input);}};

test('the road is one continuous walkable strip from the village to the courtyard',()=>{
 assert.ok(JOURNEY.south-JOURNEY.north>=340,'five times the old corridor');
 let last=bounds(JOURNEY.south);
 for(let z=JOURNEY.south;z>=JOURNEY.north;z-=.25){const b=bounds(z);assert.ok(b.max-b.min>=6,`wide enough to fight at ${z}`);assert.ok(Math.abs(b.min-last.min)<1.9&&Math.abs(b.max-last.max)<1.9,`no jump at ${z}`);assert.ok(Math.min(b.max,last.max)-Math.max(b.min,last.min)>=6,`passable at ${z}`);last=b;}
 for(let i=1;i<STATIONS.length;i++)assert.ok(STATIONS[i][0]<STATIONS[i-1][0]&&STATIONS[i][1]<STATIONS[i][2]);
 assert.equal(ZONES.length,8);for(let i=1;i<ZONES.length;i++)assert.equal(ZONES[i].from,ZONES[i-1].to);
 assert.equal(zoneAt(334).id,'village');assert.equal(zoneAt(175).id,'ravine');assert.equal(zoneAt(0).id,'temple');
 assert.ok(bounds(175).max-bounds(175).min<7,'the bridge is narrow');assert.ok(contains(11,0)&&!contains(12.5,0),'the courtyard is the round yard');
});
test('every foe, gate and find sits on the road, and chapters run north in order',()=>{
 let gate=JOURNEY.south;
 for(const stage of STAGES){assert.ok(stage.gate<=gate);gate=stage.gate;assert.ok(stage.goal&&stage.onward&&stage.name);
  for(const g of stage.groups){assert.ok(contains(g.x,g.z,1),`${stage.id} group at ${g.z}`);assert.ok(g.z>stage.gate,'in front of its own gate');if(g.when?.z!=null)assert.ok(g.when.z>g.z&&g.when.z>stage.gate+1);for(const role of g.units)assert.ok(ROLES[role],role);}
  assert.ok(stage.groups.some(g=>!g.when),'someone is there from the start');
  if(!stage.instant&&!stage.final){assert.ok(stage.gateName);const b=bounds(stage.gate);assert.ok(b.max-b.min<=11,'a gate stands in a doorway');}}
 assert.equal(STAGES.at(-1).final,true);assert.equal(RUBBINGS,12);
 for(const item of PICKUPS)assert.ok(contains(item.x,item.z,.8),item.id);
 assert.equal(new Set(PICKUPS.map(p=>p.id)).size,PICKUPS.length);
});
test('foes hold their post until the hero comes near, and striking one rouses its group',()=>{
 const g=new CampaignCombat(),posts=g.enemies.map(e=>[e.x,e.z]);run(g,2);
 assert.deepEqual(g.enemies.map(e=>[e.x,e.z]),posts);assert.ok(g.enemies.every(e=>!e.alert&&e.state==='idle'));assert.equal(g.engaged(),false);assert.equal(g.waypoint().kind,'foe');
 g.player.z=g.enemies[0].z+12;g.update(1/60);assert.ok(g.enemies.every(e=>e.alert));assert.equal(g.engaged(),true);assert.equal(g.drainEvents().filter(e=>e.type==='roused').length,1);
 const far=at('bamboo');far.withEnemy(far.enemies[2],()=>far.hitEnemy(5));assert.ok(far.enemies.every(e=>e.alert),'a hit from range wakes the pack');
});
test('between fights the hero strides out and running costs no breath; in a fight the pace is the duel\'s',()=>{
 const road=new CampaignCombat(),z0=road.player.z;road.enemies.forEach(e=>{e.z=303;});run(road,1,{x:0,z:-1,sprint:true});const walked=z0-road.player.z;assert.ok(walked>7.5&&walked<8.6,`covered ${walked}`);assert.equal(road.player.stamina,100);
 const fight=new CampaignCombat();fight.player.z=fight.enemies[0].z+10;fight.enemies.forEach(e=>{e.alert=true;e.state='recover';e.timer=100;});const z1=fight.player.z;run(fight,1,{x:0,z:-1,sprint:true});assert.ok(z1-fight.player.z<6.1);assert.ok(fight.player.stamina<100);
});
test('hidden groups arrive behind a mark or as a second wave, already hunting, and count toward the chapter',()=>{
 const g=at('steles');assert.equal(g.enemies.length,3);assert.equal(g.objective().remaining,7);assert.equal(g.objective().total,7);
 for(const e of g.enemies)g.withEnemy(e,()=>g.hitEnemy(999));g.update(1/60);assert.equal(g.cleared,false,'the clerks are still behind the stones');assert.equal(g.waypoint().kind,'mark');
 g.player.z=214;g.update(1/60);const events=g.drainEvents();assert.equal(events.filter(e=>e.type==='ambush').length,1);assert.equal(g.enemies.length,7);assert.ok(g.enemies.slice(3).every(e=>e.alert&&e.arrived!=null&&contains(e.x,e.z)));
 const wave=at('bamboo');for(const e of wave.enemies)wave.withEnemy(e,()=>wave.hitEnemy(999));wave.hitStop=0;wave.update(1/60);assert.equal(wave.enemies.filter(e=>e.hp>0).length,3,'the second pack comes when the first is down');assert.equal(wave.cleared,false);
});
test('roles are their own foes: size, toughness, reach and temper differ from the body they share',()=>{
 const g=at('forecourt'),lion=g.enemies[0],wolf=new CampaignCombat().enemies[0];
 assert.ok(lion.radius>wolf.radius*1.6&&lion.maxHp>wolf.maxHp*2&&lion.spec.speed<wolf.spec.speed);
 g.withEnemy(lion,()=>g.hitEnemy(10));assert.notEqual(lion.state,'stagger','stone keeps its poise');
 g.player.x=lion.x;g.player.z=lion.z+3;lion.alert=true;lion.cooldown=0;g.withEnemy(lion,()=>g.enemyBegin());
 assert.ok(['石顎','回身石爪','鎮門撲壓'].includes(lion.moveData.name));assert.ok(lion.moveData.range>2.8*1.3&&lion.moveData.damage>24,'moves are sized to the beast');
 assert.equal(g.drainEvents().filter(e=>e.type==='telegraph').at(-1).name,lion.moveData.name,'the tell names the move that comes');
 for(const [role,def] of Object.entries(ROLES)){assert.ok(def.name&&def.title&&def.hp>0&&def.posture>0,role);
  if(def.pattern)for(const dist of [1.5,5,9,14])for(let cycle=0;cycle<4;cycle++)for(const enraged of [false,true]){const seq=roleSequence(def.pattern,cycle,enraged,dist,true),plain=enemySequence(def.kind,cycle,enraged,dist,true).map(m=>m.kind);
   assert.ok(seq.length>=1&&seq.length<=4,role);for(const m of seq){assert.ok(m.name&&m.windup>.25&&m.recovery>=.5&&m.damage>0,`${role} ${m.name}`);assert.ok(def.kind!=='wolf'||['bite','pounce','projectile'].includes(m.kind),'a wolf body only has wolf motions');assert.ok(m.kind!=='projectile'||m.lane>=m.projectile.range-1);}
   assert.ok(seq.at(-1).recovery>=.55,'every chain ends in an opening');void plain;}}
 assert.equal(roleSequence('nobody',0,false,3),null);
});
test('clerks keep their distance and write from range; lamp-thralls burst where they fall',()=>{
 const g=at('hall'),clerk=g.enemies.find(e=>e.role==='scribe');for(const e of g.enemies)if(e!==clerk)e.hp=0;
 g.player.x=clerk.x;g.player.z=clerk.z+5;clerk.alert=true;clerk.cooldown=3;const before=Math.hypot(clerk.x-g.player.x,clerk.z-g.player.z);run(g,1.2);
 assert.ok(Math.hypot(clerk.x-g.player.x,clerk.z-g.player.z)>before+.8,'backs away when crowded');clerk.cooldown=0;run(g,.1);assert.equal(clerk.moveData.kind,'projectile');
 const road=at('lanterns'),thrall=road.enemies[0];road.player.x=thrall.x;road.player.z=thrall.z+1.5;road.player.hp=140;road.withEnemy(thrall,()=>road.hitEnemy(999));
 assert.equal(road.bursts.length,1);assert.equal(road.drainEvents().filter(e=>e.type==='burst-warn').length,1);for(const e of road.enemies)e.hp=Math.min(e.hp,0);
 road.player.invulnerable=0;run(road,1.1);assert.equal(road.bursts.length,0);assert.ok(road.player.hp<140,'standing in the ring hurts');assert.equal(road.drainEvents().filter(e=>e.type==='slam'&&e.burst).length,1);
 const clear=at('lanterns'),other=clear.enemies[0];clear.withEnemy(other,()=>clear.hitEnemy(999));clear.player.z=other.z+9;run(clear,1.1);assert.equal(clear.player.hp,140,'stepping out avoids it');
});
test('rubbings and shrines are found by walking to them, once, and are kept through a retry',()=>{
 const g=new CampaignCombat(),r1=PICKUPS[0],shrine=PICKUPS.find(p=>p.kind==='shrine');g.enemies.forEach(e=>{e.x=6;e.z=302;});g.player.hp=100;g.player.qi=0;
 g.player.x=r1.x+.5;g.player.z=r1.z;g.update(1/60);assert.ok(g.collected.has(r1.id));assert.equal(g.rubbings(),1);assert.equal(g.player.qi,12);assert.equal(g.player.hp,108);
 assert.equal(g.drainEvents().filter(e=>e.type==='rubbing'&&e.count===1).length,1);g.update(1/60);assert.equal(g.player.qi,12,'only once');
 const h=at('bamboo');h.player.flasks=3;h.player.hp=h.player.maxHp;h.player.x=shrine.x;h.player.z=shrine.z;h.update(1/60);assert.equal(h.collected.has(shrine.id),false,'a full hero leaves the shrine for later');
 h.player.flasks=0;h.player.hp=40;h.update(1/60);assert.ok(h.collected.has(shrine.id));assert.equal(h.player.flasks,3);assert.equal(h.player.hp,90);
 h.saveCheckpoint();assert.ok(h.retryCheckpoint().collected.has(shrine.id));
});
test('the false god does not end the fight: the robe falls, then the nameless thing rises where it stood',()=>{
 const g=at('oni');g.player.qi=0;for(const id of ['r1','r2','r3','r4'])g.collected.add(id);g.withEnemy(g.enemies[0],()=>g.hitEnemy(999));g.hitStop=0;g.update(1/60);
 assert.equal(g.cleared,true);assert.equal(g.status,'playing');assert.equal(g.drainEvents().filter(e=>e.type==='phase-break').length,1);
 run(g,1);assert.equal(g.objective().id,'oni','the body falls first');run(g,2);assert.equal(g.objective().id,'nameless');
 const boss=g.enemies[0];assert.equal(boss.role,'nameless');assert.equal(boss.enraged,true);assert.ok(boss.maxHp>440);assert.equal(g.player.qi,32,'four names read out');
 assert.equal(g.drainEvents().filter(e=>e.type==='chapter').length,1);g.withEnemy(boss,()=>g.hitEnemy(9999));g.hitStop=0;g.update(1/60);assert.equal(g.status,'won');
});
test('early chapters are forgiving, the masters hit at full weight, and the map draws wherever the hero stands',()=>{
 const soft=new CampaignCombat();soft.hitPlayer(20,soft.enemy,true);assert.equal(soft.player.hp,130);const hard=at('nameless');hard.hitPlayer(20,hard.enemy,true);assert.equal(hard.player.hp,120);
 const calls=[],ctx=new Proxy({},{get:(_,k)=>k==='canvas'?null:(...a)=>{calls.push(k);},set:()=>true}),canvas={width:180,height:244,getContext:()=>ctx};
 for(const id of ['village','bridge','hall','nameless']){const g=at(id);g.player.z=g.enemies[0].z+8;calls.length=0;assert.doesNotThrow(()=>drawBattleMap(canvas,g));assert.ok(calls.includes('fill')&&calls.includes('arc'));}
 assert.ok(Math.abs(centre(175))<.01);
});
