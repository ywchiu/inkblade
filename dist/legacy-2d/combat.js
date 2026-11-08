export const ENEMIES = [
  {name:'墨狼', subtitle:'THE INK WOLF', chapter:'竹影試煉', place:'竹林', hp:100, speed:215, range:155, damage:14, windup:.78, recovery:1.25, type:'wolf', hint:'紅光聚起時，閃避撲擊，再追上反擊。'},
  {name:'無相劍客', subtitle:'THE FACELESS SWORD', chapter:'古寺問劍', place:'古寺', hp:145, speed:160, range:170, damage:18, windup:.58, recovery:.95, type:'sword', hint:'按住 K 格擋；在劍刃落下前瞬間按下，可彈反破招。'},
  {name:'山魈', subtitle:'THE MOUNTAIN SPIRIT', chapter:'山門決意', place:'山門', hp:210, speed:100, range:225, damage:24, windup:1.05, recovery:1.55, type:'golem', hint:'震地前有紅圈預警；跳起躲開震波，再趁收招進攻。'}
];
export const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const actor = (x,hp) => ({x,y:0,vy:0,hp,maxHp:hp,face:1,stun:0,flash:0,attack:0,attackTotal:0,attackHit:false,invuln:0,dead:false});
export class Combat {
  constructor(index=0) { this.reset(index); }
  reset(index=0) {
    this.index=clamp(index,0,2); this.spec=ENEMIES[this.index];
    this.player={...actor(340,120),qi:0,dodge:0,dodgeCooldown:0,guard:false,guardTime:0,combo:0,chain:0,chainWindow:0,comboTime:0,ultimate:false};
    this.enemy={...actor(965,this.spec.hp),face:-1,windup:0,recover:1.3,phase:0,attackKind:'normal',attackTarget:340};
    this.events=[]; this.time=0;this.status='playing';this.waves=[];this.stats={hits:0,parries:0,dodges:0,maxCombo:0};
  }
  emit(type,data={}) {this.events.push({type,...data});}
  action(key) {
    if(this.status!=='playing')return;
    const p=this.player;if(p.stun>0)return;
    if(key==='jump'&&p.y===0&&p.dodge<=0){p.vy=590;p.guard=false;this.emit('jump',{x:p.x});}
    if(key==='dodge'&&p.dodgeCooldown<=0&&p.attack<=0){p.dodge=.3;p.invuln=.32;p.dodgeCooldown=.85;p.guard=false;this.emit('dodge',{x:p.x});}
    if(key==='attack'&&p.attack<=0&&p.dodge<=0&&!p.guard){
      p.chain=p.chainWindow>0?(p.chain%3)+1:1;p.chainWindow=.95;p.attackTotal=p.chain===3?.48:.32;p.attack=p.attackTotal;p.attackHit=false;p.ultimate=false;
      this.emit('slash',{x:p.x,chain:p.chain});
    }
    if(key==='ultimate'&&p.qi>=100&&p.dodge<=0&&p.attack<=0){p.qi=0;p.attackTotal=.85;p.attack=.85;p.attackHit=false;p.ultimate=true;p.invuln=.9;this.emit('ultimate',{x:p.x});}
  }
  damageEnemy(amount,kind='hit') {
    const e=this.enemy,p=this.player;if(e.hp<=0)return;
    e.hp=Math.max(0,e.hp-amount);e.flash=.16;e.stun=kind==='parry'?1.15:kind==='ultimate-hit'?.7:e.stun;e.x=clamp(e.x+p.face*(kind==='ultimate-hit'?75:16),65,1215);
    p.qi=clamp(p.qi+(kind==='parry'?25:kind==='ultimate-hit'?0:12),0,100);
    p.combo++;p.comboTime=2;this.stats.hits++;this.stats.maxCombo=Math.max(this.stats.maxCombo,p.combo);
    this.emit(kind,{x:e.x,y:e.y+75,damage:amount});
    if(e.hp<=0){e.dead=true;this.status='won';this.emit('victory');}
  }
  hurtPlayer(amount,from,parryable=true) {
    const p=this.player,e=this.enemy;if(p.hp<=0)return;
    if(p.invuln>0){this.stats.dodges++;this.emit('evade',{x:p.x});return;}
    const front=(from-p.x)*p.face>=-10;
    if(p.guard&&front&&p.y<10){
      if(p.guardTime<=.22&&parryable){e.windup=0;e.attack=0;e.stun=1.15;e.recover=1.5;this.stats.parries++;this.damageEnemy(15,'parry');return;}
      amount=Math.ceil(amount*.2);p.qi=clamp(p.qi+5,0,100);this.emit('block',{x:p.x,y:70});
    }else{p.stun=.25;p.attack=0;p.combo=0;this.emit('hurt',{x:p.x,y:p.y+65,damage:amount});}
    p.hp=Math.max(0,p.hp-amount);p.flash=.2;p.invuln=.45;p.x=clamp(p.x+(p.x>=from?1:-1)*24,65,1215);
    if(p.hp<=0){p.dead=true;this.status='lost';this.emit('defeat');}
  }
  update(dt,input={}) {
    if(this.status!=='playing')return;
    dt=clamp(dt,0,.04);this.time+=dt;
    const p=this.player,e=this.enemy,s=this.spec;
    for(const a of [p,e])for(const key of ['stun','flash','invuln'])a[key]=Math.max(0,a[key]-dt);
    for(const key of ['dodgeCooldown','chainWindow','comboTime'])p[key]=Math.max(0,p[key]-dt);
    if(!p.comboTime)p.combo=0;
    if(p.y>0||p.vy>0){p.y=Math.max(0,p.y+p.vy*dt);p.vy-=1480*dt;if(p.y===0){p.vy=0;this.emit('land',{x:p.x});}}
    const guarding=!!input.guard&&p.y===0&&p.dodge<=0&&p.attack<=0&&p.stun<=0;
    p.guardTime=guarding?(p.guard?p.guardTime+dt:0):0;p.guard=guarding;
    const move=(input.right?1:0)-(input.left?1:0);
    if(p.dodge>0){p.dodge=Math.max(0,p.dodge-dt);p.x+=p.face*710*dt;}
    else if(move&&p.stun<=0){if(p.attack<=0)p.face=move;p.x+=move*(p.guard?85:p.attack>0?90:280)*dt;}
    else if(p.attack<=0&&p.stun<=0){p.face=e.x>=p.x?1:-1;}
    p.x=clamp(p.x,65,1215);
    if(input.attack)this.action('attack');
    if(p.attack>0){p.attack-=dt;const elapsed=p.attackTotal-p.attack;
      if(!p.attackHit&&elapsed>=(p.ultimate?.24:.11)){p.attackHit=true;const dx=e.x-p.x;const range=p.ultimate?700:p.chain===3?195:160;
        if(Math.abs(dx)<range&&(dx*p.face>-35||p.ultimate)&&Math.abs(p.y-e.y)<135)this.damageEnemy(p.ultimate?48:p.chain===3?20:12,p.ultimate?'ultimate-hit':'hit');
      }
    }
    if(this.status!=='playing')return;
    e.face=p.x>=e.x?1:-1;
    if(e.stun>0){e.windup=0;e.attack=0;}
    else if(e.windup>0){
      e.windup-=dt;
      if(e.windup<=0){e.attack=.35;e.attackTotal=.35;e.attackHit=false;e.recover=s.recovery;
        if(e.attackKind==='quake'){this.waves.push({x:e.x,r:15,hit:false,life:1.25});this.emit('quake',{x:e.x});}
        else this.emit('enemy-slash',{x:e.x});
      }
    }else if(e.attack>0){
      e.attack-=dt;
      if(s.type==='wolf')e.x+=e.face*400*dt;
      if(!e.attackHit&&e.attack<.21){e.attackHit=true;
        if(e.attackKind!=='quake'&&Math.abs(p.x-e.x)<s.range&&p.y<125)this.hurtPlayer(s.damage,e.x);
      }
      if(e.attack<=0&&s.type==='sword'&&e.phase%2===1&&e.stun<=0){e.phase++;e.windup=.33;this.emit('telegraph',{x:e.x,kind:'normal'});}
    }else if(e.recover>0){e.recover=Math.max(0,e.recover-dt);}
    else{
      const dist=Math.abs(p.x-e.x);
      if(dist>s.range-25)e.x+=e.face*s.speed*dt;
      else{e.phase++;e.windup=s.windup;e.attackTarget=p.x;e.attackKind=s.type==='golem'&&e.phase%2===1?'quake':'normal';this.emit('telegraph',{x:e.x,kind:e.attackKind});}
    }
    e.x=clamp(e.x,65,1215);
    const separation=s.type==='golem'?90:s.type==='wolf'?70:55;
    if(p.y<90&&p.dodge<=0&&Math.abs(p.x-e.x)<separation){const side=p.x<e.x?-1:1;p.x=clamp(e.x+side*separation,65,1215);}
    for(const wave of this.waves){wave.r+=450*dt;wave.life-=dt;if(!wave.hit&&Math.abs(Math.abs(p.x-wave.x)-wave.r)<40&&p.y<50){wave.hit=true;this.hurtPlayer(21,wave.x,false);}}
    this.waves=this.waves.filter(w=>w.life>0);
  }
  drainEvents(){const out=this.events;this.events=[];return out;}
}
