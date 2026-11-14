import { ArenaCombat, ENEMIES, clamp, distance, angleTo, withinArc, turnTo, angleDiff } from './combat3d.js';
import { STAGES, PICKUPS, JOURNEY, bounds, centre } from './journey3d.js';
import { roleSequence } from './enemy-patterns.js';
export const CHAPTERS=STAGES;
// Who walks the mountain. `kind` is the body and base rules (wolf, ronin, oni); everything else is what makes
// the role its own foe: size, toughness, how it fights (`pattern`), whether a clean hit makes it flinch (`poise`
// means it does not), how far it stays from the hero (`keep`), and what it leaves behind when it falls (`burst`).
export const ROLES=Object.freeze({
 wolf:{kind:'wolf',name:'墨狼',title:'受役魂咒驅使的獵魂獸',hp:58,posture:36},
 mare:{kind:'wolf',name:'魘狼',title:'只剩影子的餓魂',hp:38,posture:26,scale:.82,speed:1.35,tint:'#8f7fc4',pattern:'mare'},
 alpha:{kind:'wolf',name:'啣名狼王',title:'替全村按下手印的老獵戶',hp:250,posture:110,scale:1.5,harm:1.25,reach:1.3,tint:'#b06a58',bright:1.5,poise:true,elite:true,pattern:'alpha'},
 lion:{kind:'wolf',skin:'beast',name:'鎮門石獸',title:'被改了主人的護山獸',hp:170,posture:130,scale:1.75,speed:.7,harm:1.3,reach:1.35,tint:'#b9c0bd',bright:2.3,poise:true,pattern:'lion'},
 shade:{kind:'ronin',name:'寒舟劍影',title:'借名契所縛的劍意',hp:100,posture:58,tint:'#9fb6d8'},
 scribe:{kind:'ronin',skin:'scribe',name:'抄名鬼吏',title:'替偽神謄寫名冊的差役',hp:66,posture:40,scale:.94,tint:'#b9c48e',pattern:'scribe',keep:8.5,rest:1.5},
 thrall:{kind:'ronin',name:'燃名燈奴',title:'名字被當作燈油的香客',hp:84,posture:50,speed:1.15,tint:'#ffb070',aura:'#ff9a4a',pattern:'thrall',burst:{delay:.95,radius:3.2,damage:20}},
 hanzhou:{kind:'ronin',name:'沈寒舟',title:'誤信還魂之約的亡魂',hp:300,posture:120,poise:true,elite:true},
 acolyte:{kind:'oni',name:'泥塑護法',title:'被偽神喚醒的山門塑像',hp:210,posture:105,scale:.62,speed:1.1,harm:.7,reach:.66,tint:'#c9a98a',bright:1.6,poise:true,pattern:'acolyte'},
 oni:{kind:'oni',name:'鎮祟山魈',title:'竊名拘魂的偽山神',hp:440,posture:150,poise:true,boss:true},
 nameless:{kind:'oni',name:'無名之主',title:'脫下神袍的吞名之物',hp:560,posture:175,scale:1.18,harm:1.1,reach:1.15,tint:'#8a78b0',aura:'#7b5cff',poise:true,boss:true,enraged:true,pattern:'nameless'}
});
const AGGRO=15,ENGAGED=22,REACH=1.4,TRAVEL=.4;
// Shared combat rules, individual enemies, one long road and one player.
export class CampaignCombat extends ArenaCombat {
 constructor(checkpoint=null){super(0);this.campaign=true;this.stage=0;this.kills=0;this.cleared=false;this.interlude=0;this.enemies=[];this.pending=[];this.bursts=[];this.collected=new Set();this.serial=0;this.combo=0;this.comboTimer=0;this.bestCombo=0;this.player.x=JOURNEY.start.x;this.player.z=JOURNEY.start.z;this.player.qi=45;if(checkpoint){this.stage=checkpoint.stage;this.kills=checkpoint.kills;this.bestCombo=checkpoint.bestCombo;this.time=checkpoint.time;this.stats={...checkpoint.stats};this.collected=new Set(checkpoint.collected);Object.assign(this.player,checkpoint.player);}this.spawnStage();}
 saveCheckpoint(){const p=this.player;this.checkpoint={stage:this.stage,kills:this.kills,bestCombo:this.bestCombo,time:this.time,stats:{...this.stats},collected:[...this.collected],player:{x:p.x,z:p.z,yaw:Math.PI,hp:p.hp,stamina:100,qi:p.qi,flasks:p.flasks}};}
 retryCheckpoint(){return new CampaignCombat(structuredClone(this.checkpoint));}
 rubbings(){return PICKUPS.filter(p=>p.kind==='rubbing'&&this.collected.has(p.id)).length;}
 spawnStage(){const stage=STAGES[this.stage];this.cleared=false;this.interlude=0;this.projectiles=[];this.arts=[];this.bursts=[];this.enemies=[];this.pending=stage.groups.map((g,index)=>({...g,index}));
  for(const g of [...this.pending])if(!g.when)this.deploy(g);
  this.enemy=this.enemies[0];this.spec=this.enemy.spec;this.index=ENEMIES.findIndex(s=>s.id===this.enemy.kindId);
  // Every name carried up the mountain is read out against the thing that ate them.
  if(stage.final)this.player.qi=clamp(Math.max(this.player.qi,this.rubbings()*8),0,100);
  this.saveCheckpoint();this.emit('chapter',{stage:this.stage,id:stage.id,name:stage.name});
 }
 // Put a group on the road. Those waiting from the start stand in ranks and hold their post until the hero
 // comes near; those that arrive later close in from around their mark, already hunting.
 deploy(g,ambush=false){this.pending=this.pending.filter(v=>v!==g);const n=g.units.length;
  g.units.forEach((role,i)=>{const def=ROLES[role],index=ENEMIES.findIndex(s=>s.id===def.kind),base=ENEMIES[index],e=new ArenaCombat(index).enemy,scale=def.scale||1;
   e.id=++this.serial;e.kindId=def.kind;e.role=role;e.group=g.index;e.scale=scale;e.identity={name:def.name,title:def.title};
   e.spec={...base,speed:base.speed*(def.speed||1),radius:base.radius*scale,range:base.range*(def.reach||1)};e.radius=e.spec.radius;
   if(ambush){const a=i/n*Math.PI*2+g.index;e.x=g.x+Math.sin(a)*3.6;e.z=g.z+Math.cos(a)*3.6;}else if(n===1){e.x=g.x;e.z=g.z;}else{const row=Math.floor(i/3),col=i%3,width=Math.min(n-row*3,3);e.x=g.x+(col-(width-1)/2)*3.1;e.z=g.z+1.6-row*3.2;}
   e.hp=e.maxHp=def.hp;e.maxPosture=def.posture;e.cooldown=(ambush?1.3:1)+i*.24;e.alert=ambush;e.enraged=!!def.enraged;e.arrived=ambush?this.time:null;this.enemies.push(e);});
  this.constrain();if(ambush)this.emit('ambush',{x:g.x,z:g.z,count:n,enemyId:this.enemies.at(-1).id});
 }
 targets(){return this.enemies||[this.enemy];}
 withEnemy(e,fn){const old=this.enemy,spec=this.spec,index=this.index;this.enemy=e;this.spec=e.spec;this.index=ENEMIES.findIndex(s=>s.id===e.kindId);try{return fn();}finally{this.enemy=old;this.spec=spec;this.index=index;}}
 emit(type,data={}){const def=ROLES[this.enemy?.role];if(type==='enrage'&&!(def?.boss||def?.elite))return;super.emit(type,{enemyId:this.enemy?.id,...data});}
 // A fight is on while a roused foe is close; between fights the road is walked, not duelled.
 engaged(){return this.enemies.some(e=>e.hp>0&&e.alert&&distance(e,this.player)<ENGAGED);}
 selectTarget(force=false){const living=this.enemies.filter(e=>e.hp>0);if(!living.length)return;const roused=living.filter(e=>e.alert),pool=roused.length?roused:living,nearest=pool.reduce((a,b)=>distance(this.player,a)<distance(this.player,b)?a:b);if(force||this.enemy.hp<=0||!this.enemy.alert&&nearest.alert||distance(this.player,this.enemy)>8&&distance(this.player,nearest)<5){this.enemy=nearest;this.spec=nearest.spec;this.index=ENEMIES.findIndex(s=>s.id===nearest.kindId);}}
 cycleTarget(){const living=this.enemies.filter(e=>e.hp>0);if(living.length<2)return;this.enemy=living[(living.indexOf(this.enemy)+1)%living.length];this.spec=this.enemy.spec;this.index=ENEMIES.findIndex(s=>s.id===this.enemy.kindId);}
 action(name,dx=0,dz=0){if(name==='target'){this.cycleTarget();return true;}if(['light','heavy','dash'].includes(name)&&this.player.state==='idle')this.selectTarget();return super.action(name,dx,dz);}
 strike(move,special){let hits=0;const selected=this.enemy;for(const e of this.enemies){if(e.hp<=0||this.player.move==='execute'&&e!==selected)continue;if(!withinArc(this.player,e,move.range+e.radius*.3,move.arc))continue;this.withEnemy(e,()=>{this.hitEnemy(move.damage,move.posture,this.strikeKind(move,special));if(this.player.move==='execute')this.stats.executions++;if(this.player.move==='riposte')this.stats.counters++;});hits++;}if(!hits)this.emit('miss');}
 hitEnemy(damage,posture=0,kind='hit'){const e=this.enemy;if(e.hp<=0)return;this.rouse(e);super.hitEnemy(damage,posture,kind);this.combo++;this.comboTimer=3;this.bestCombo=Math.max(this.bestCombo,this.combo);
  // Ordinary troops flinch on a clean hit; elites and the mountain's masters keep their poise.
  if(e.hp>0&&!ROLES[e.role].poise&&!e.exposed){e.stun=Math.max(e.stun,this.player.state==='special'?.85:.32);e.state='stagger';e.comboLeft=0;}
 }
 hitPlayer(damage,source,unblockable=false,projectile=false){super.hitPlayer(Math.max(1,Math.ceil(damage*STAGES[this.stage].harm)),source,unblockable,projectile);}
 enemyDefeated(e){const def=ROLES[e.role];this.kills++;e.deadTime=0;this.player.qi=clamp(this.player.qi+(def.elite||def.boss?20:9),0,100);this.emit('troop-defeated',{x:e.x,z:e.z,kills:this.kills,role:e.role});
  if(def.burst){this.bursts.push({id:e.id,x:e.x,z:e.z,time:def.burst.delay,total:def.burst.delay,radius:def.burst.radius,damage:def.burst.damage});this.emit('burst-warn',{x:e.x,z:e.z,radius:def.burst.radius});}
 }
 rouse(e){if(e.alert)return;for(const mate of this.enemies)if(mate.group===e.group&&!mate.alert){mate.alert=true;mate.cooldown=Math.max(mate.cooldown,.5);}this.emit('roused',{x:e.x,z:e.z,group:e.group,enemyId:e.id});}
 // The base rules choose a move by body; a role with its own way of fighting swaps in its sequence,
 // and every move is sized to the foe that throws it.
 enemyBegin(combo=false){const e=this.enemy,def=ROLES[e.role],cycle=e.cycle,ready=e.rangedCooldown<=0;super.enemyBegin(combo);
  if(!combo&&def.pattern){const sequence=roleSequence(def.pattern,cycle,e.enraged,distance(e,this.player),ready);
   if(sequence){const move=sequence[0],told=this.events.at(-1);e.sequence=sequence;e.sequenceIndex=0;e.moveData=move;e.kind=move.kind;e.variant=move.variant;e.comboLeft=sequence.length-1;e.timer=e.total=move.windup;e.rangedCooldown=sequence.some(m=>m.projectile)?7:ready?0:e.rangedCooldown;if(told?.type==='telegraph'){told.kind=move.kind;told.name=move.name;}}}
  const move=e.moveData,harm=def.harm||1,reach=def.reach||1;if(!move.sized&&(harm!==1||reach!==1))e.moveData={...move,sized:true,damage:Math.ceil(move.damage*harm),range:move.range*reach};
 }
 updateEnemies(dt){const p=this.player,living=this.enemies.filter(e=>e.hp>0);let committed=living.filter(e=>['windup','attack'].includes(e.state)).length;
  for(const e of this.enemies){if(e.hp<=0){e.deadTime=(e.deadTime||0)+dt;continue;}const def=ROLES[e.role];
   if(!e.alert){if(distance(e,p)<=AGGRO||e.hp<e.maxHp)this.rouse(e);else{e.state='idle';e.yaw=turnTo(e.yaw,angleTo(e,p),dt*1.5);continue;}}
   this.withEnemy(e,()=>{const idle=e.state==='idle',limited=idle&&committed>=2;if(limited&&e.stun<=0){this.encircle(e,living,dt);return;}
    if(def.keep&&idle&&e.stun<=0&&this.standOff(e,def,dt))return;
    const before=e.state;this.stepEnemy(dt);if(idle&&e.state==='windup')committed++;if(def.rest&&before==='recover'&&e.state==='idle')e.cooldown+=def.rest;});
  }
 }
 // Casters hold their distance: back away when crowded, drift in when left alone, and loose when ready.
 standOff(e,def,dt){const p=this.player,dist=distance(e,p);e.cooldown=Math.max(0,e.cooldown-dt);e.yaw=turnTo(e.yaw,angleTo(e,p),dt*5);if(dist<3)return false;
  if(e.cooldown<=0&&dist<=18){this.enemyBegin();return true;}
  const dir=dist<def.keep-1.5?-1:dist>def.keep+2?1:0,speed=e.spec.speed*(dir<0?1.25:1);e.x+=Math.sin(e.yaw)*dir*speed*dt;e.z+=Math.cos(e.yaw)*dir*speed*dt;e.speed=dir?speed:0;return true;
 }
 encircle(e,living,dt){
  // Stable slots avoid every waiting troop chasing the same point. Active attacks keep their trajectories.
  const slot=living.indexOf(e),yaw=slot/living.length*Math.PI*2+this.time*.12,radius=e.kindId==='wolf'?4.5:5.2;
  const tz=clamp(this.player.z+Math.cos(yaw)*radius,this.floor()+2,JOURNEY.south-2),edge=bounds(tz),tx=clamp(this.player.x+Math.sin(yaw)*radius,edge.min+1.5,edge.max-1.5);
  const currentRadius=distance(e,this.player),currentYaw=angleTo(this.player,e),desiredRadius=Math.hypot(tx-this.player.x,tz-this.player.z),desiredYaw=Math.atan2(tx-this.player.x,tz-this.player.z);
  const turn=dt*Math.min(.9,e.spec.speed*1.25/Math.max(1,currentRadius)),nextYaw=currentYaw+clamp(angleDiff(desiredYaw,currentYaw),-turn,turn),nextRadius=currentRadius+clamp(desiredRadius-currentRadius,-dt*2.5,dt*2.5),nx=this.player.x+Math.sin(nextYaw)*nextRadius,nz=this.player.z+Math.cos(nextYaw)*nextRadius;
  e.speed=Math.hypot(nx-e.x,nz-e.z)/dt;e.x=nx;e.z=nz;e.yaw=turnTo(e.yaw,angleTo(e,this.player),dt*5);e.cooldown=Math.max(.15,e.cooldown-dt);
 }
 updateBursts(dt){const p=this.player;this.bursts=this.bursts.filter(b=>{b.time-=dt;if(b.time>0)return true;this.emit('slam',{x:b.x,z:b.z,burst:true,radius:b.radius});if(Math.hypot(p.x-b.x,p.z-b.z)<=b.radius+p.radius)this.hitPlayer(b.damage,b,false,true);return false;});}
 collect(){const p=this.player;for(const item of PICKUPS){if(this.collected.has(item.id)||Math.hypot(p.x-item.x,p.z-item.z)>REACH)continue;
   if(item.kind==='rubbing'){this.collected.add(item.id);p.qi=clamp(p.qi+12,0,100);p.hp=Math.min(p.maxHp,p.hp+8);this.emit('rubbing',{id:item.id,x:item.x,z:item.z,count:this.rubbings()});}
   else if(p.flasks<3||p.hp<p.maxHp){this.collected.add(item.id);p.flasks=3;p.hp=Math.min(p.maxHp,p.hp+50);this.emit('shrine',{id:item.id,x:item.x,z:item.z});}}
 }
 update(dt,input={}){if(this.status!=='playing')return;this.selectTarget();const hold=this.hitStop>0,gathering=!!this.ultimate()?.charging,fighting=this.engaged(),breath=this.player.stamina;super.update(dt,{...input,lock:input.lock&&!this.cleared&&fighting});if(this.status!=='playing')return;
  // Between fights the road is long: the hero strides out, and running costs no breath.
  if(!fighting&&!hold&&['idle','guard'].includes(this.player.state)&&this.player.speed>0){const p=this.player,m=Math.hypot(input.x||0,input.z||0),extra=p.speed*TRAVEL;if(m>.01){p.x+=(input.x||0)/Math.max(1,m)*extra*Math.min(dt,.05);p.z+=(input.z||0)/Math.max(1,m)*extra*Math.min(dt,.05);p.speed+=extra;}p.stamina=Math.max(p.stamina,breath);this.constrain();}
  if(!hold){this.comboTimer=Math.max(0,this.comboTimer-dt);if(this.comboTimer===0)this.combo=0;}
  if(!hold&&!gathering){this.updateBursts(dt);if(this.status!=='playing')return;}
  const stage=STAGES[this.stage],p=this.player;this.collect();
  for(const g of [...this.pending])if(g.when?.z!=null?p.z<=g.when.z:this.enemies.every(e=>e.hp<=0))this.deploy(g,true);
  if(!this.cleared&&!this.pending.length&&this.enemies.every(e=>e.hp<=0)){this.cleared=true;this.projectiles=[];if(stage.final){this.status='won';this.emit('victory');return;}p.hp=Math.min(p.maxHp,p.hp+35);p.stamina=100;p.flasks=Math.min(3,p.flasks+1);this.interlude=2.6;this.emit(stage.instant?'phase-break':'gate-open',{stage:this.stage,name:STAGES[this.stage+1].name});}
  else if(this.cleared&&stage.instant){if(!hold)this.interlude-=dt;if(this.interlude<=0&&!this.ultimate()){this.stage++;this.spawnStage();}}
  // The gate takes a breath to open: the fallen go down and the chapter's last words are said on this side of it.
  else if(this.cleared&&this.interlude>0)this.interlude-=dt;
  else if(this.cleared&&p.z<=stage.gate+1){this.stage++;this.spawnStage();}
  this.selectTarget();
 }
 // The southern edge of the next closed gate: nobody passes it until the chapter is cleared.
 floor(){const stage=STAGES[this.stage];return this.cleared&&this.interlude<=0&&!stage.instant&&!stage.final?JOURNEY.north:Math.max(JOURNEY.north,stage.gate+.8);}
 constrain(){const lower=this.floor();for(const a of [this.player,...this.enemies]){a.z=clamp(a.z,lower+a.radius,JOURNEY.south-a.radius);const edge=bounds(a.z),half=Math.min(a.radius,(edge.max-edge.min)/2);a.x=clamp(a.x,edge.min+half,edge.max-half);}}
 // Where the road leads next: the nearest foe still standing, the mark a hidden group waits behind, or the open gate.
 waypoint(){const p=this.player,stage=STAGES[this.stage];if(this.status!=='playing')return null;if(this.cleared)return stage.instant||stage.final?null:{x:centre(stage.gate),z:stage.gate,kind:'gate'};
  const living=this.enemies.filter(e=>e.hp>0);if(living.length){const e=living.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);return{x:e.x,z:e.z,kind:'foe'};}
  const next=this.pending.find(g=>g.when?.z!=null);return next?{x:centre(next.when.z),z:next.when.z,kind:'mark'}:null;
 }
 objective(){const stage=STAGES[this.stage],waiting=this.pending.reduce((n,g)=>n+g.units.length,0),living=this.enemies.filter(e=>e.hp>0).length;return {stage:this.stage,stages:STAGES.length,id:stage.id,name:stage.name,zone:stage.zone,goal:this.status==='won'?STAGES.at(-1).onward:this.cleared?stage.onward:stage.goal,gate:stage.gate,cleared:this.cleared,kills:this.kills,remaining:living+waiting,total:stage.groups.reduce((n,g)=>n+g.units.length,0),combo:this.combo,bestCombo:this.bestCombo,rubbings:this.rubbings(),engaged:this.engaged()};}
}
