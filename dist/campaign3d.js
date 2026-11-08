import { ArenaCombat, ENEMIES, clamp, distance, angleTo, withinArc, turnTo, angleDiff } from './combat3d.js';
export const CHAPTERS=Object.freeze([
 {name:'竹影狼襲',zone:'雨竹林',center:48,gate:36,goal:'擊散獵魂狼群，尋回失蹤者的線索',roster:['wolf','wolf','wolf','wolf','wolf','wolf']},
 {name:'斷橋守刃',zone:'古道劍陣',center:24,gate:12,goal:'破開守橋劍陣，查明借名契',roster:['ronin','ronin','ronin','wolf','wolf']},
 {name:'山門鎮祟',zone:'鎮祟寺',center:0,gate:-10,goal:'斬除偽神，毀契釋放眾魂',roster:['oni']}
]);
// Shared combat rules, individual enemies, one continuous battlefield and player.
export class CampaignCombat extends ArenaCombat {
 constructor(checkpoint=null){super(0);this.campaign=true;this.stage=0;this.kills=0;this.cleared=false;this.enemies=[];this.serial=0;this.combo=0;this.comboTimer=0;this.bestCombo=0;this.player.z=56;this.player.qi=45;if(checkpoint){this.stage=checkpoint.stage;this.kills=checkpoint.kills;this.bestCombo=checkpoint.bestCombo;this.time=checkpoint.time;this.stats={...checkpoint.stats};Object.assign(this.player,checkpoint.player);}this.spawnStage();}
 saveCheckpoint(){const p=this.player;this.checkpoint={stage:this.stage,kills:this.kills,bestCombo:this.bestCombo,time:this.time,stats:{...this.stats},player:{x:p.x,z:p.z,yaw:Math.PI,hp:p.hp,stamina:100,qi:p.qi,flasks:p.flasks}};}
 retryCheckpoint(){return new CampaignCombat(structuredClone(this.checkpoint));}
 spawnStage(){const chapter=CHAPTERS[this.stage];this.cleared=false;this.projectiles=[];
  this.enemies=chapter.roster.map((kind,i)=>{const index=ENEMIES.findIndex(s=>s.id===kind),source=new ArenaCombat(index),e=source.enemy;const row=Math.floor(i/3),col=i%3;e.id=++this.serial;e.kindId=kind;e.spec={...ENEMIES[index]};e.x=chapter.roster.length===1?0:(col-1)*3.1;e.z=chapter.center+2-row*3.2;e.cooldown=1+i*.24;e.hp=e.maxHp=kind==='oni'?440:kind==='ronin'?100:58;e.maxPosture=kind==='oni'?150:kind==='ronin'?58:36;return e;});
  this.enemy=this.enemies[0];this.spec=this.enemy.spec;this.index=ENEMIES.findIndex(s=>s.id===this.enemy.kindId);this.saveCheckpoint();this.emit('chapter',{stage:this.stage,name:chapter.name});
 }
 targets(){return this.enemies||[this.enemy];}
 withEnemy(e,fn){const old=this.enemy,spec=this.spec,index=this.index;this.enemy=e;this.spec=e.spec;this.index=ENEMIES.findIndex(s=>s.id===e.kindId);try{return fn();}finally{this.enemy=old;this.spec=spec;this.index=index;}}
 emit(type,data={}){if(type==='enrage'&&this.enemy?.kindId!=='oni')return;super.emit(type,{enemyId:this.enemy?.id,...data});}
 selectTarget(force=false){const living=this.enemies.filter(e=>e.hp>0);if(!living.length)return;const nearest=living.reduce((a,b)=>distance(this.player,a)<distance(this.player,b)?a:b);if(force||this.enemy.hp<=0||distance(this.player,this.enemy)>8&&distance(this.player,nearest)<5){this.enemy=nearest;this.spec=nearest.spec;this.index=ENEMIES.findIndex(s=>s.id===nearest.kindId);}}
 cycleTarget(){const living=this.enemies.filter(e=>e.hp>0);if(living.length<2)return;this.enemy=living[(living.indexOf(this.enemy)+1)%living.length];this.spec=this.enemy.spec;this.index=ENEMIES.findIndex(s=>s.id===this.enemy.kindId);}
 action(name,dx=0,dz=0){if(name==='target'){this.cycleTarget();return true;}if(['light','heavy','dash'].includes(name)&&this.player.state==='idle')this.selectTarget();return super.action(name,dx,dz);}
 strike(move,special){let hits=0;const selected=this.enemy;for(const e of this.enemies){if(e.hp<=0||this.player.move==='execute'&&e!==selected)continue;if(!withinArc(this.player,e,move.range+e.radius*.3,move.arc))continue;this.withEnemy(e,()=>{this.hitEnemy(move.damage,move.posture,this.player.move==='execute'?'execution-hit':this.player.move==='riposte'?'counter-hit':special?'special-hit':'hit');if(this.player.move==='execute')this.stats.executions++;if(this.player.move==='riposte')this.stats.counters++;});hits++;}if(!hits)this.emit('miss');}
 hitEnemy(damage,posture=0,kind='hit'){const e=this.enemy;if(e.hp<=0)return;super.hitEnemy(damage,posture,kind);this.combo++;this.comboTimer=3;this.bestCombo=Math.max(this.bestCombo,this.combo);
  // Ordinary troops flinch on a clean hit; the mountain boss retains its poise.
  if(e.hp>0&&e.kindId!=='oni'&&!e.exposed){e.stun=Math.max(e.stun,this.player.state==='special'?.85:.32);e.state='stagger';e.comboLeft=0;}
 }
 hitPlayer(damage,source,unblockable=false,projectile=false){super.hitPlayer(this.stage<2?Math.ceil(damage*.55):damage,source,unblockable,projectile);}
 enemyDefeated(e){this.kills++;e.deadTime=0;this.player.qi=clamp(this.player.qi+9,0,100);this.emit('troop-defeated',{x:e.x,z:e.z,kills:this.kills});}
 updateEnemies(dt){const living=this.enemies.filter(e=>e.hp>0);let committed=this.enemies.filter(e=>e.hp>0&&['windup','attack'].includes(e.state)).length;
  for(const e of this.enemies){if(e.hp<=0){e.deadTime=(e.deadTime||0)+dt;continue;}
   this.withEnemy(e,()=>{const idle=e.state==='idle',limited=idle&&committed>=2;if(limited&&e.stun<=0){this.encircle(e,living,dt);return;}this.stepEnemy(dt);if(idle&&e.state==='windup')committed++;});
  }
 }
 encircle(e,living,dt){
  // Stable slots avoid every waiting troop chasing the same point. Active attacks keep their trajectories.
  const slot=living.indexOf(e),yaw=slot/living.length*Math.PI*2+this.time*.12,radius=e.kindId==='wolf'?4.5:5.2;
  const x=clamp(this.player.x+Math.sin(yaw)*radius,-9,9),z=clamp(this.player.z+Math.cos(yaw)*radius,CHAPTERS[this.stage].gate+2,58);
  const currentRadius=distance(e,this.player),currentYaw=angleTo(this.player,e),desiredRadius=Math.hypot(x-this.player.x,z-this.player.z),desiredYaw=Math.atan2(x-this.player.x,z-this.player.z);
  const turn=dt*Math.min(.9,e.spec.speed*1.25/Math.max(1,currentRadius)),nextYaw=currentYaw+clamp(angleDiff(desiredYaw,currentYaw),-turn,turn),nextRadius=currentRadius+clamp(desiredRadius-currentRadius,-dt*2.5,dt*2.5),nx=this.player.x+Math.sin(nextYaw)*nextRadius,nz=this.player.z+Math.cos(nextYaw)*nextRadius;
  e.speed=Math.hypot(nx-e.x,nz-e.z)/dt;e.x=nx;e.z=nz;e.yaw=turnTo(e.yaw,angleTo(e,this.player),dt*5);e.cooldown=Math.max(.15,e.cooldown-dt);
 }
 updateProjectiles(dt,before){super.updateProjectiles(dt,before);}
 update(dt,input={}){if(this.status!=='playing')return;this.selectTarget();const hold=this.hitStop>0;super.update(dt,{...input,lock:input.lock&&!this.cleared});if(this.status!=='playing')return;
  if(!hold){this.comboTimer=Math.max(0,this.comboTimer-dt);if(this.comboTimer===0)this.combo=0;}
  if(!this.cleared&&this.enemies.every(e=>e.hp<=0)){this.cleared=true;this.projectiles=[];if(this.stage===2){this.status='won';this.emit('victory');return;}this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);this.player.stamina=100;this.player.flasks=Math.min(3,this.player.flasks+1);this.emit('gate-open',{name:CHAPTERS[this.stage+1].name});}
  if(this.cleared&&this.player.z<=CHAPTERS[this.stage].gate+1){this.stage++;this.spawnStage();}
  this.selectTarget();
 }
 constrain(){const lower=this.cleared?-10:CHAPTERS[this.stage].gate+.8;for(const a of [this.player,...this.enemies]){a.x=clamp(a.x,-10.5+a.radius,10.5-a.radius);a.z=clamp(a.z,lower+a.radius,60-a.radius);}}
 objective(){return {stage:this.stage,name:CHAPTERS[this.stage].name,zone:CHAPTERS[this.stage].zone,goal:this.status==='won'?'借名契已破 · 眾魂得歸':this.cleared?(this.stage===0?'向北尋守橋人 · 沿金色路標前進':'前往山門毀契 · 沿金色路標前進'):CHAPTERS[this.stage].goal,gate:CHAPTERS[this.stage].gate,cleared:this.cleared,kills:this.kills,remaining:this.enemies.filter(e=>e.hp>0).length,total:CHAPTERS[this.stage].roster.length,combo:this.combo,bestCombo:this.bestCombo};}
}
