import { DASH, dashTravel } from './dash3d.js';
import { enemySequence } from './enemy-patterns.js';
import { DODGE, dodgeTravel } from './dodge3d.js';
import { PLAYER_MOVES, LIGHT_CHAIN, playerMove, attackTravel } from './attack-moves.js';
// Pure simulation: positions and attack cones use the arena's X/Z plane.
export const ENEMIES = [
 {id:'wolf',name:'墨狼',title:'竹影獵魂',hp:230,speed:3.2,radius:.78,range:2.35,damage:19,windup:.68,recovery:1.1,posture:70,hint:'墨狼只會近身追咬；撲殺時向側方閃開，等連咬結束後還擊。'},
 {id:'ronin',name:'無相劍客',title:'古寺守刃',hp:310,speed:2.35,radius:.55,range:2.8,damage:23,windup:.82,recovery:1.2,posture:100,hint:'劍氣會接第二發，突刺方向在蓄勢中段固定；側閃後等連招結束再還擊。'},
 {id:'oni',name:'鎮祟山魈',title:'山門之主',hp:440,speed:2.5,radius:1.05,range:3.3,damage:31,windup:1.18,recovery:1.65,posture:150,hint:'裂地波與震地不可格擋；橫向避開紅色預警，再等連招收招後重擊破勢。'}
];
// Seconds of unbroken sprint before an attack press becomes the leaping cut.
export const SPRINT_ATTACK=.18;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angleTo=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const turnTo=(from,to,speed)=>from+clamp(angleDiff(to,from),-speed,speed);
export function withinArc(attacker,target,range,halfAngle){return distance(attacker,target)<=range&&Math.abs(angleDiff(angleTo(attacker,target),attacker.yaw))<=halfAngle;}
const base=(x,z,hp,radius)=>({x,z,yaw:0,hp,maxHp:hp,radius,state:'idle',timer:0,total:0,flash:0,speed:0,stun:0,attackHit:false,invulnerable:0,actionAge:0,impact:null,impactSerial:0,knockbackX:0,knockbackZ:0});
export class ArenaCombat {
 constructor(index=1){this.reset(index);}
 reset(index=1){this.index=clamp(index,0,2);this.spec=ENEMIES[this.index];this.player={...base(0,4.8,140,.5),yaw:Math.PI,stamina:100,maxStamina:100,regenDelay:0,qi:0,flasks:3,guardAge:0,chain:0,chainWindow:0,queuedLight:false,queuedFinisher:null,move:null,counterWindow:0,perfectDodged:false,dodgeOrigin:null,inputBuffer:null,dashCooldown:0,queuedDashAttack:false,dashYaw:Math.PI,rollX:0,rollZ:-1,sprintTime:0,hitIndex:0};this.enemy={...base(0,-3.5,this.spec.hp,this.spec.radius),yaw:0,cooldown:.9,rangedCooldown:0,chaseSpeed:0,posture:0,maxPosture:this.spec.posture,phase:0,kind:'slash',comboLeft:0,targetYaw:0,enraged:false,exposed:false,postureDelay:0,sequence:[],sequenceIndex:0,cycle:0,moveData:null};this.projectiles=[];this.arts=[];this.striking=null;this.projectileSerial=0;this.time=0;this.hitStop=0;this.status='playing';this.events=[];this.stats={hits:0,damageTaken:0,parries:0,dodges:0,perfectDodges:0,counters:0,executions:0,heals:0};}
 emit(type,data={}){this.events.push({type,...data});}
 drainEvents(){const v=this.events;this.events=[];return v;}
 spend(amount){const p=this.player;if(p.stamina<amount){this.emit('exhausted');return false;}p.stamina-=amount;p.regenDelay=.8;return true;}
 canExecute(){return this.enemy.exposed&&this.enemy.state==='stagger'&&distance(this.player,this.enemy)<=3.4;}
 // Sprinting long enough that an attack press is the leaping cut rather than a standing one.
 canLeap(){const p=this.player;return this.status==='playing'&&p.state==='idle'&&p.stun<=0&&p.sprintTime>=SPRINT_ATTACK;}
 // Which ink art an attack from the guard would be, if there is qi for it; otherwise the ordinary cut.
 guardArt(name){const p=this.player,id=name==='heavy'?'seal':'inkWave';return p.state==='guard'&&p.stun<=0&&p.qi>=PLAYER_MOVES[id].qiCost?id:null;}
 action(name,dx=0,dz=0){if(this.status!=='playing')return false;const p=this.player,e=this.enemy;
  // A heavy input branches from a light cut; contact must occur before the finisher starts.
  if(name==='heavy'&&p.state==='light'&&p.stun<=0&&!playerMove(p).art){const id=p.chain>=2?'sweep':'rising';if(p.stamina<PLAYER_MOVES[id].cost){this.emit('exhausted');return false;}p.queuedFinisher=id;p.queuedLight=false;p.inputBuffer=null;return true;}
  // A single short buffer makes a near-end press reliable without queuing whole combos.
  const recoverCancel=name==='roll'&&p.state==='light'&&p.total-p.timer>=playerMove(p).impact+.08;
  const counterCancel=name==='heavy'&&p.state==='roll'&&p.counterWindow>0&&p.actionAge>=.18;
  if(['roll','heavy'].includes(name)&&p.stun<=0&&(this.hitStop>0||name==='heavy'&&p.state==='roll'&&p.counterWindow>0&&!counterCancel||(!['idle','guard'].includes(p.state)&&p.timer<=.16&&!recoverCancel&&!counterCancel))){p.inputBuffer={name,dx,dz,time:.18};return true;}
  if(this.hitStop>0)return false;
  if(name==='light'&&p.state==='dash'){p.queuedDashAttack=true;return true;}
  if((recoverCancel||counterCancel)&&p.stamina>=(counterCancel?18:24)){p.state='idle';p.queuedLight=false;p.queuedFinisher=null;}

  if(name==='light'&&p.state==='light'&&p.timer<=.22&&p.stun<=0&&!p.queuedFinisher){p.queuedLight=true;return true;}
  if(p.stun>0||!['idle','guard'].includes(p.state))return false;
  if(name==='dash'){if(p.dashCooldown>0||!this.spend(DASH.cost))return false;p.state='dash';p.dashYaw=p.yaw;p.timer=p.total=DASH.duration;p.actionAge=0;p.dashCooldown=DASH.cooldown;p.queuedDashAttack=false;p.queuedLight=false;p.queuedFinisher=null;p.inputBuffer=null;p.invulnerable=DASH.invulnerable;this.emit('dash',{x:p.x,z:p.z});return true;}
  if(name==='roll'){if(!this.spend(24))return false;const l=Math.hypot(dx,dz);p.rollX=l>.01?dx/l:-Math.sin(p.yaw);p.rollZ=l>.01?dz/l:-Math.cos(p.yaw);p.dodgeYaw=p.yaw;p.dodgeOrigin={x:p.x,z:p.z};p.perfectDodged=false;p.state='roll';p.timer=p.total=DODGE.duration;p.actionAge=0;p.invulnerable=DODGE.invulnerable;p.queuedLight=false;p.queuedFinisher=null;p.inputBuffer=null;p.chainWindow=p.chainWindow>0?.85:0;this.emit('roll',{x:p.x,z:p.z});return true;}
  if(name==='light'||name==='heavy'){
   const execution=name==='heavy'&&this.canExecute(),counter=name==='heavy'&&!execution&&p.counterWindow>0;
   // Held guard turns the attack button into the ink arts; an opening (execute, riposte) still comes first.
   const art=!execution&&!counter?this.guardArt(name):null;if(art)return this.startArt(art);
   const leap=name==='light'&&this.canLeap();
   if(!execution&&!this.spend(counter?18:leap?PLAYER_MOVES.leap.cost:name==='heavy'?30:16))return false;
   p.chain=name==='heavy'?0:leap?1:p.chainWindow>0?(p.chain%LIGHT_CHAIN.length)+1:1;p.chainWindow=name==='heavy'?0:1.25;
   p.move=execution?'execute':counter?'riposte':name==='heavy'?'heavy':leap?'leap':LIGHT_CHAIN[p.chain-1];
   const move=PLAYER_MOVES[p.move];p.state=name;p.timer=p.total=move.duration;p.actionAge=0;p.attackHit=false;p.hitIndex=0;p.queuedLight=false;p.queuedFinisher=null;p.inputBuffer=null;
   if(counter){p.counterWindow=0;this.emit('counter',{x:p.x,z:p.z});}
   if(execution){p.counterWindow=0;e.exposed=false;e.stun=Math.max(e.stun,1.15);p.invulnerable=.8;this.emit('execution',{x:p.x,z:p.z});}
   // A leap follows the run; it only turns to a foe that is already roughly ahead.
   if(leap){const l=Math.hypot(dx,dz),heading=l>.01?Math.atan2(dx,dz):p.yaw,aim=angleTo(p,e);p.yaw=e.hp>0&&distance(p,e)<8&&Math.abs(angleDiff(aim,heading))<1.05?aim:heading;}
   else if(distance(p,e)<6)p.yaw=angleTo(p,e);
   this.emit('swing',{heavy:name==='heavy',move:p.move,chain:p.chain,x:p.x,z:p.z});return true;
  }
  if(name==='heal'){if(!p.flasks||p.hp>=p.maxHp)return false;p.flasks--;p.state='heal';p.timer=p.total=1.3;p.actionAge=0;p.attackHit=false;this.emit('healing');return true;}
  if(name==='special'){if(p.qi<100)return false;p.qi=0;p.state='special';p.move='spin';p.queuedLight=false;p.queuedFinisher=null;p.chain=0;p.chainWindow=0;p.timer=p.total=PLAYER_MOVES.spin.duration;p.actionAge=0;p.attackHit=false;p.hitIndex=0;p.invulnerable=1.15;p.yaw=angleTo(p,e);this.emit('special',{x:p.x,z:p.z});return true;}
  return false;
 }
 // 飛墨斬 and 敕令 · 鎮 are paid for in qi, not stamina, and give none back.
 startArt(id){const p=this.player,e=this.enemy,move=PLAYER_MOVES[id];p.qi-=move.qiCost;p.move=id;p.state=move.projectile?'light':'heavy';p.timer=p.total=move.duration;p.actionAge=0;p.attackHit=false;p.hitIndex=0;p.queuedLight=false;p.queuedFinisher=null;p.inputBuffer=null;p.chain=0;p.chainWindow=0;
  if(move.ward)p.invulnerable=Math.max(p.invulnerable,move.ward);if(e.hp>0&&distance(p,e)<(move.projectile?move.projectile.range+2:6))p.yaw=angleTo(p,e);
  this.emit('swing',{heavy:!move.projectile,move:id,art:id,x:p.x,z:p.z});return true;}
 startFinisher(id){const p=this.player,move=PLAYER_MOVES[id];p.queuedFinisher=null;if(!['rising','sweep'].includes(id)||!this.spend(move.cost))return false;p.move=id;p.state='heavy';p.timer=p.total=move.duration;p.actionAge=0;p.attackHit=false;p.queuedLight=false;p.inputBuffer=null;p.chain=0;p.chainWindow=0;this.emit('swing',{heavy:true,move:id,x:p.x,z:p.z});return true;}
 impactActor(target,source,{heavy=false,blocked=false,parry=false}={}){
  const yaw=angleTo(source,target),strength=blocked?.22:parry?1:heavy?1:.62;
  const duration=blocked?.24:heavy?.48:.34;
  target.impactSerial++;
  target.impact={id:target.impactSerial,time:duration,total:duration,strength,dirX:Math.sin(yaw),dirZ:Math.cos(yaw),heavy,blocked};
  const distance=blocked?.08:target===this.player?(heavy?.7:.48):this.spec.id==='oni'?(heavy?.34:.14):(heavy?.58:.26);
  target.knockbackX=Math.sin(yaw)*distance*8;target.knockbackZ=Math.cos(yaw)*distance*8;
  const stop=blocked?.028:parry?.10:heavy?.105:.055;this.hitStop=Math.max(this.hitStop,stop);
  return {target:target===this.player?'player':'enemy',sourceX:source.x,sourceZ:source.z,dirX:Math.sin(yaw),dirZ:Math.cos(yaw),strength,heavy,blocked,hitStop:stop,impactId:target.impactSerial};
 }
 hitEnemy(damage,posture=0,kind='hit'){
  const p=this.player,e=this.enemy;if(e.hp<=0)return;
  e.hp=Math.max(0,e.hp-damage);e.flash=.18;if(kind==='execution-hit')this.hitStop=Math.max(this.hitStop,.16);e.postureDelay=3;e.posture+=e.exposed?0:posture;const by=kind==='parry'?null:this.striking;p.qi=clamp(p.qi+(p.state==='special'?0:kind==='parry'?24:by?.gain??11),0,100);this.stats.hits++;const impact=this.impactActor(e,by?.from||p,{heavy:by?.heavy??(p.state==='heavy'||kind==='special-hit'),parry:kind==='parry'});this.emit(kind,{x:e.x,z:e.z,damage,...impact});
  if(e.posture>=e.maxPosture&&!e.exposed){e.posture=0;e.exposed=true;e.stun=2.6;e.state='stagger';e.timer=e.total=2.6;e.comboLeft=0;this.emit('stagger',{x:e.x,z:e.z});}
  if(e.hp<=0){e.state='dead';this.enemyDefeated(e);}
 }
 hitPlayer(damage,source,unblockable=false,projectile=false){const p=this.player,e=this.enemy;if(p.hp<=0)return;
  if(p.invulnerable>0){if(p.state==='roll'){this.stats.dodges++;this.rewardDodge(projectile);}this.emit('evade');return;}
  let blocked=false;const facing=Math.abs(angleDiff(angleTo(p,source),p.yaw))<Math.PI*.55;
  if(p.state==='guard'&&facing&&!unblockable){
   if(p.guardAge<=.2){if(projectile){this.stats.parries++;p.counterWindow=1.4;p.stamina=clamp(p.stamina+8,0,100);this.hitStop=Math.max(this.hitStop,.07);this.emit('parry',{x:p.x,z:p.z,target:'player',projectile:true,impactId:++p.impactSerial});return;}this.stats.parries++;e.stun=1.5;e.state='stagger';e.timer=e.total=1.5;e.comboLeft=0;this.hitEnemy(12,36,'parry');p.counterWindow=1.4;p.stamina=clamp(p.stamina+10,0,100);return;}
   const cost=damage*1.1;if(p.stamina>=cost){p.stamina-=cost;p.regenDelay=1;damage=Math.ceil(damage*.12);blocked=true;this.emit('block',{x:p.x,z:p.z,damage,...this.impactActor(p,source,{blocked:true})});}
   else{p.stamina=0;p.stun=1.1;p.regenDelay=1.6;this.emit('guard-break');}
  }
  if(damage>0){p.hp=Math.max(0,p.hp-damage);p.flash=.22;p.invulnerable=.55;this.stats.damageTaken+=damage;const impact=blocked?{target:'player',blocked:true}:this.impactActor(p,source,{heavy:unblockable||damage>=30});this.emit('hurt',{x:p.x,z:p.z,damage,...impact});
   if(p.state!=='guard'||p.stamina===0){p.state='hurt';p.queuedLight=false;p.queuedFinisher=null;p.queuedDashAttack=false;p.inputBuffer=null;p.counterWindow=0;p.timer=p.total=Math.max(.4,p.stun);p.actionAge=0;p.stun=p.timer;}
   if(p.hp<=0){p.state='dead';this.status='lost';this.projectiles=[];this.arts=[];this.emit('defeat');}
  }
 }
 rewardDodge(projectile=false){const p=this.player;if((!projectile&&this.enemy.state!=='attack')||p.state!=='roll'||p.actionAge>.22||p.perfectDodged)return false;p.perfectDodged=true;p.counterWindow=1.4;p.stamina=clamp(p.stamina+14,0,100);p.qi=clamp(p.qi+15,0,100);this.stats.perfectDodges++;this.hitStop=Math.max(this.hitStop,.065);this.emit('perfect-dodge',{x:p.x,z:p.z});return true;}
 enemyThreat(point){const e=this.enemy,range=e.moveData?.range??(e.kind==='slam'?4.1:this.spec.range);return e.kind==='slam'?distance(e,point)<range:withinArc(e,point,range,e.kind==='thrust'?.45:1.05);}
 enemyBegin(combo=false){
  const e=this.enemy;
  if(!combo){e.sequence=enemySequence(this.spec.id,e.cycle++,e.enraged,distance(e,this.player),e.rangedCooldown<=0);e.sequenceIndex=0;if(e.sequence.some(m=>m.projectile))e.rangedCooldown=7;}
  else e.sequenceIndex++;
  const move=e.sequence[e.sequenceIndex];e.moveData=move;e.phase++;e.kind=move.kind;e.variant=move.variant;e.comboLeft=e.sequence.length-e.sequenceIndex-1;e.state='windup';e.timer=e.total=move.windup;e.actionAge=0;e.chaseSpeed=0;e.targetYaw=angleTo(e,this.player);e.yaw=e.targetYaw;this.emit('telegraph',{kind:e.kind,name:move.name,x:e.x,z:e.z});
 }
 launchProjectiles(){
  const e=this.enemy,m=e.moveData,shot=m.projectile;
  for(const offset of shot.spread){const yaw=e.yaw+offset;this.projectiles.push({id:++this.projectileSerial,x:e.x+Math.sin(yaw)*.8,z:e.z+Math.cos(yaw)*.8,yaw,speed:shot.speed,radius:shot.radius,remaining:shot.range,style:shot.style,damage:m.damage,unblockable:!!m.unblockable});}
  this.emit('projectile-release',{x:e.x,z:e.z,style:shot.style});
 }
 updateProjectiles(dt,playerBefore){
  const p=this.player;
  // Sweep relative to the player's movement too: fast projectiles cannot tunnel.
  const survivors=[];
  for(const shot of this.projectiles){
   const from={x:shot.x,z:shot.z},travel=Math.min(shot.remaining,shot.speed*dt);
   shot.x+=Math.sin(shot.yaw)*travel;shot.z+=Math.cos(shot.yaw)*travel;shot.remaining-=travel;
   const ax=from.x-playerBefore.x,az=from.z-playerBefore.z,bx=shot.x-p.x,bz=shot.z-p.z,dx=bx-ax,dz=bz-az;
   const u=clamp(-(ax*dx+az*dz)/(dx*dx+dz*dz||1),0,1),touch=Math.hypot(ax+u*dx,az+u*dz)<=shot.radius+p.radius;
   const origin=p.dodgeOrigin,sx=shot.x-from.x,sz=shot.z-from.z,t=origin?clamp(((origin.x-from.x)*sx+(origin.z-from.z)*sz)/(sx*sx+sz*sz||1),0,1):0;
   const nearOrigin=origin&&Math.hypot(from.x+sx*t-origin.x,from.z+sz*t-origin.z)<=shot.radius+p.radius;
   if(touch){this.hitPlayer(shot.damage,{x:p.x-Math.sin(shot.yaw)*2,z:p.z-Math.cos(shot.yaw)*2},shot.unblockable,true);}
   else if(nearOrigin&&this.rewardDodge(true)){this.stats.dodges++;}
   else if(shot.remaining>0&&(this.campaign||Math.hypot(shot.x,shot.z)<24))survivors.push(shot);
   if(this.status!=='playing')break;
  }
  this.projectiles=this.status==='playing'?survivors:[];
 }
 update(dt,input={}){
  if(this.status!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;if(this.hitStop>0){const held=Math.min(dt,this.hitStop);this.hitStop=Math.max(0,this.hitStop-held);dt-=held;if(dt<1e-8)return;}const p=this.player,e=this.enemy,s=this.spec,playerBefore={x:this.player.x,z:this.player.z};
  // The ultimate gathers in stopped time: only the hero's own timeline advances until the release.
  if(this.ultimate()?.charging){const charge=playerMove(p).charge;p.timer-=dt;p.actionAge+=dt;p.flash=Math.max(0,p.flash-dt);for(const a of this.targets())a.speed=0;if(p.total-p.timer>=charge)this.emit('special-release',{x:p.x,z:p.z,yaw:p.yaw});return;}
  for(const a of this.targets())a.rangedCooldown=Math.max(0,a.rangedCooldown-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);
  for(const a of[p,...this.targets()]){a.flash=Math.max(0,a.flash-dt);a.stun=Math.max(0,a.stun-dt);a.invulnerable=Math.max(0,a.invulnerable-dt);a.actionAge+=dt;a.speed=0;if(a.impact)a.impact.time=Math.max(0,a.impact.time-dt);const decay=Math.exp(-8*dt);a.x+=a.knockbackX*(1-decay)/8;a.z+=a.knockbackZ*(1-decay)/8;a.knockbackX*=decay;a.knockbackZ*=decay;}
  p.counterWindow=Math.max(0,p.counterWindow-dt);if(p.inputBuffer){p.inputBuffer.time-=dt;if(p.inputBuffer.time<=0)p.inputBuffer=null;}for(const target of this.targets()){target.postureDelay=Math.max(0,target.postureDelay-dt);if(target.postureDelay===0&&!target.exposed)target.posture=Math.max(0,target.posture-dt*8*(target.hp/target.maxHp));}
  p.chainWindow=Math.max(0,p.chainWindow-dt);p.regenDelay=Math.max(0,p.regenDelay-dt);if(p.regenDelay<=0&&['idle','guard'].includes(p.state))p.stamina=clamp(p.stamina+(p.state==='guard'?11:34)*dt,0,100);
  const m=Math.hypot(input.x||0,input.z||0),dx=m>.01?(input.x||0)/Math.max(1,m):0,dz=m>.01?(input.z||0)/Math.max(1,m):0;
  if(!['idle','guard'].includes(p.state)||p.stun>0)p.sprintTime=0;
  if(['idle','guard'].includes(p.state)&&p.stun<=0){
   const guard=!!input.guard;p.guardAge=guard?(p.state==='guard'?p.guardAge+dt:0):0;p.state=guard?'guard':'idle';
   if(input.lock)p.yaw=turnTo(p.yaw,angleTo(p,e),dt*12);else if(m>.01)p.yaw=turnTo(p.yaw,Math.atan2(dx,dz),dt*12);
   const sprint=input.sprint&&p.stamina>0&&!guard&&m>.01;const speed=guard?1.45:sprint?5.8:3.25;p.x+=dx*speed*dt;p.z+=dz*speed*dt;p.speed=m>.01?speed:0;
   p.sprintTime=sprint?p.sprintTime+dt:0;if(sprint){p.stamina=Math.max(0,p.stamina-18*dt);p.regenDelay=.75;}
  }else if(p.state==='roll'){const before=p.total-p.timer;p.timer=Math.max(0,p.timer-dt);const travel=dodgeTravel(p.total-p.timer)-dodgeTravel(before);p.x+=p.rollX*travel;p.z+=p.rollZ*travel;p.speed=dt>0?travel/dt:0;if(p.timer<=0){p.state='idle';p.invulnerable=0;}}
  else if(p.state==='dash'){const before=p.total-p.timer;p.timer=Math.max(0,p.timer-dt);const travel=dashTravel(p.total-p.timer)-dashTravel(before);this.advancePlayer(travel,p.dashYaw);p.speed=travel/dt;if(p.queuedDashAttack&&p.actionAge>=DASH.linkAt&&p.stamina>=14){this.spend(14);const move=PLAYER_MOVES.dashCut;p.state='light';p.move='dashCut';p.timer=p.total=move.duration;p.actionAge=0;p.attackHit=false;p.queuedDashAttack=false;p.chain=1;p.chainWindow=1.25;this.emit('swing',{move:'dashCut',x:p.x,z:p.z});}else if(p.timer<=0){p.state='idle';p.queuedDashAttack=false;}}
  else if(['light','heavy','special'].includes(p.state)){
   p.timer-=dt;const elapsed=p.total-p.timer;
   const move=playerMove(p),travel=attackTravel(move,elapsed)-attackTravel(move,elapsed-dt);if(move.advance)this.advancePlayer(travel,p.yaw);else{p.x+=Math.sin(p.yaw)*travel;p.z+=Math.cos(p.yaw)*travel;}
   const impact=move.impact;
   if(move.projectile){if(!p.attackHit&&elapsed>=impact){p.attackHit=true;this.launchArt(move);}}
   else if(move.hits){while(p.hitIndex<move.hits.length&&elapsed>=move.hits[p.hitIndex].at&&this.status==='playing')this.land({...move,...move.hits[p.hitIndex++]},p.state==='special');p.attackHit=p.hitIndex>=move.hits.length;}
   else if(!p.attackHit&&elapsed>=impact){p.attackHit=true;this.land(move,p.state==='special');}
   if(p.state==='light'&&p.queuedFinisher&&p.attackHit&&elapsed>=impact+.10&&this.hitStop<=0){this.startFinisher(p.queuedFinisher);}
   // A tap buffered during an art is read against the guard as it is held now, so a second crescent can follow the first.
   if(p.timer<=0){const chain=p.state==='light',queued=p.queuedLight;p.state=queued&&move.art&&input.guard?'guard':'idle';p.queuedLight=false;p.queuedFinisher=null;if(chain)p.chainWindow=move.art?0:.6;if(queued)this.action('light');}
  }else if(p.state==='heal'){p.timer-=dt;if(!p.attackHit&&p.timer<.35){p.attackHit=true;p.hp=clamp(p.hp+65,0,p.maxHp);this.stats.heals++;this.emit('healed');}if(p.timer<=0)p.state='idle';}
  else if(p.state==='hurt'){p.timer-=dt;if(p.timer<=0)p.state='idle';}
  if(this.status!=='playing')return;
  if(p.inputBuffer&&(['idle','guard'].includes(p.state)||p.inputBuffer.name==='heavy'&&p.state==='roll'&&p.counterWindow>0&&p.actionAge>=.18||p.inputBuffer.name==='roll'&&p.state==='light'&&p.total-p.timer>=playerMove(p).impact+.08)){const queued=p.inputBuffer;p.inputBuffer=null;this.action(queued.name,queued.dx,queued.dz);}
  this.updateEnemies(dt);
  this.updateProjectiles(dt,playerBefore);
  this.updateArts(dt);
  this.resolveBodies();this.constrain();
 }
 targets(){return [this.enemy];}
 // Runs `fn` with `this.enemy` standing for one particular foe. A duel has only the one; a crowd overrides this.
 withEnemy(e,fn){return fn();}
 // One scheduled contact of the hero's current move. `striking` tells hitEnemy what landed
 // (its weight, the qi it returns) however many foes the strike reaches.
 land(move,special){const p=this.player;this.striking=move;try{this.strike(move,special);}finally{this.striking=null;}if(move.shock)this.emit('art',{art:move.id,x:p.x,z:p.z,yaw:p.yaw,radius:move.shock});}
 // 飛墨斬 leaves the blade as a crescent of ink: a shot of the hero's own, kept apart from the enemies' projectiles.
 launchArt(move){const p=this.player,s=move.projectile,fx=Math.sin(p.yaw),fz=Math.cos(p.yaw),lead=.6;
  this.arts.push({id:++this.projectileSerial,move:move.id,x:p.x+fx*lead,z:p.z+fz*lead,yaw:p.yaw,speed:s.speed,radius:s.radius,remaining:s.range-lead,pierce:s.pierce,struck:[],damage:move.damage,posture:move.posture});
  this.emit('art',{art:move.id,x:p.x,z:p.z,yaw:p.yaw});
 }
 updateArts(dt){
  const kept=[];
  for(const shot of this.arts){
   const fx=Math.sin(shot.yaw),fz=Math.cos(shot.yaw),travel=Math.min(shot.remaining,shot.speed*dt),move=PLAYER_MOVES[shot.move];
   // Swept along this step's path, nearest first: it passes through each foe once and stops at its limit.
   const reached=this.targets().filter(e=>e.hp>0&&!shot.struck.includes(e)).map(e=>{const along=clamp((e.x-shot.x)*fx+(e.z-shot.z)*fz,0,travel);return{e,along,gap:Math.hypot(e.x-shot.x-fx*along,e.z-shot.z-fz*along)};}).filter(h=>h.gap<=shot.radius+h.e.radius).sort((a,b)=>a.along-b.along);
   for(const {e} of reached){if(shot.pierce<=0||this.status!=='playing')break;shot.struck.push(e);shot.pierce--;this.striking={...move,from:{x:e.x-fx*2,z:e.z-fz*2}};try{this.withEnemy(e,()=>this.hitEnemy(shot.damage,shot.posture,'hit'));}finally{this.striking=null;}}
   shot.x+=fx*travel;shot.z+=fz*travel;shot.remaining-=travel;
   if(this.status!=='playing')break;
   if(shot.pierce>0&&shot.remaining>0)kept.push(shot);else this.emit('art-end',{art:shot.move,x:shot.x,z:shot.z,yaw:shot.yaw,spent:shot.pierce<=0});
  }
  this.arts=this.status==='playing'?kept:[];
 }
 enemyDefeated(){this.status='won';this.projectiles=[];this.arts=[];this.emit('victory');}
 // While the ultimate is running: how far in it is and whether it is still gathering.
 ultimate(){const p=this.player;if(p.state!=='special')return null;const move=playerMove(p);if(!move.charge)return null;const age=p.total-p.timer;return{age,charge:move.charge,total:p.total,charging:age<move.charge,move};}
 // A multi-hit move lands its lead-in cuts as ordinary hits; only the last one carries the special's weight.
 strikeKind(move,special){const id=this.player.move;return id==='execute'?'execution-hit':id==='riposte'?'counter-hit':special&&(!move.hits||move.final)?'special-hit':'hit';}
 strike(move,special){const p=this.player,e=this.enemy;if(withinArc(p,e,move.range+e.radius*.3,move.arc)){this.hitEnemy(move.damage,move.posture,this.strikeKind(move,special));if(p.move==='execute')this.stats.executions++;if(p.move==='riposte')this.stats.counters++;}else this.emit('miss');}
 advancePlayer(travel,yaw){
  const p=this.player,dx=Math.sin(yaw),dz=Math.cos(yaw);let allowed=travel;
  for(const e of this.targets()){if(e.hp<=0)continue;const x=e.x-p.x,z=e.z-p.z,along=x*dx+z*dz,r=p.radius+e.radius+.02,side=x*x+z*z-along*along;if(along>0&&side<r*r)allowed=Math.min(allowed,Math.max(0,along-Math.sqrt(r*r-side)));}
  p.x+=dx*allowed;p.z+=dz*allowed;
 }
 resolveBodies(){const actors=[this.player,...this.targets().filter(e=>e.hp>0)];for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){const p=actors[i],e=actors[j],sep=p.radius+e.radius,dist=distance(p,e);if(dist<sep){const nx=dist>.001?(p.x-e.x)/dist:1,nz=dist>.001?(p.z-e.z)/dist:0,push=sep-dist;p.x+=nx*push*.65;p.z+=nz*push*.65;e.x-=nx*push*.35;e.z-=nz*push*.35;}}}
 constrain(){for(const a of[this.player,...this.targets()]){const d=Math.hypot(a.x,a.z),limit=11.8-a.radius;if(d>limit){a.x*=limit/d;a.z*=limit/d;}}}
 updateEnemies(dt){this.stepEnemy(dt);}
 stepEnemy(dt){const p=this.player,e=this.enemy,s=this.spec;if(e.hp<=0)return;
  if(e.hp<e.maxHp*.45&&!e.enraged){e.enraged=true;this.emit('enrage');}
  if(e.stun>0){e.state='stagger';e.timer=e.stun;}
  else if(e.state==='stagger'){e.exposed=false;e.state='recover';e.timer=.7;}
  else if(e.state==='windup'){
   e.timer-=dt;
   // Most tracking ends halfway through the windup, making lateral dodges meaningful.
   if(e.timer>e.total*.5){e.targetYaw=angleTo(e,p);e.yaw=turnTo(e.yaw,e.targetYaw,dt*7);}
   if(e.timer<=0){e.state='attack';e.timer=e.total=e.moveData?.duration??(e.kind==='pounce'?.52:.48);e.attackHit=false;e.actionAge=0;this.emit('enemy-swing',{kind:e.kind,variant:e.variant,x:e.x,z:e.z,yaw:e.yaw});}
  }else if(e.state==='attack'){
   e.timer-=dt;const move=e.moveData,progress=1-e.timer/e.total;
   const speed=move?.speed??(e.kind==='pounce'?8:e.kind==='thrust'?5:0),advance=move?.advance&&e.actionAge<(move.advanceUntil??.23)?move.advance:0;
   if(speed||advance){e.x+=Math.sin(e.yaw)*(speed+advance)*dt;e.z+=Math.cos(e.yaw)*(speed+advance)*dt;e.speed=speed+advance;}
   if(!e.attackHit&&progress>=.4){
    if(move?.projectile){e.attackHit=true;this.launchProjectiles();}
    else{
     if(e.kind==='slam')this.emit('slam',{x:e.x,z:e.z});
     const threat=this.enemyThreat(p),nearMiss=p.state==='roll'&&p.dodgeOrigin&&this.enemyThreat(p.dodgeOrigin);
     if(threat){e.attackHit=true;this.hitPlayer(move?.damage??s.damage,e,e.kind==='slam');}
     else if(nearMiss&&this.rewardDodge()){e.attackHit=true;this.stats.dodges++;}
     if(!move?.activeWindow||progress>=.88)e.attackHit=true;
    }
   }
   if(e.timer<=0&&e.stun<=0){if(e.comboLeft>0){this.enemyBegin(true);}else{e.state='recover';e.timer=move?.recovery??s.recovery;e.chaseSpeed=0;}}
  }else if(e.state==='recover'){e.timer-=dt;if(e.timer<=0){e.state='idle';e.cooldown=s.id==='wolf'?.48:.28;}}
  else{
   e.cooldown=Math.max(0,e.cooldown-dt);const dist=distance(p,e);e.yaw=turnTo(e.yaw,angleTo(e,p),dt*4);
   const canReach=dist<= (s.id==='wolf'?7.5:s.id==='oni'?6.5:9.5)||s.id!=='wolf'&&e.rangedCooldown<=0&&dist<=18&&(s.id!=='oni'||dist>7);
   if(e.cooldown<=0&&canReach)this.enemyBegin();
   else{
    const sprint=dist>5,targetSpeed=s.speed*(sprint?1.75:1)*(e.enraged?1.12:1);e.chaseSpeed=Math.min(targetSpeed,e.chaseSpeed+dt*7);
    // A brief lateral reposition between wolf chains changes the next attack angle.
    const orbit=s.id==='wolf'&&dist<5.5&&e.cooldown>0,side=e.cycle%2?1:-1;
    const yaw=e.yaw+(orbit?side*1.05:0),speed=dist>s.range*.75?e.chaseSpeed:orbit?s.speed:0;
    e.x+=Math.sin(yaw)*speed*dt;e.z+=Math.cos(yaw)*speed*dt;e.speed=speed;
   }
  }
 }
}
