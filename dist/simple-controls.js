import { PLAYER_MOVES } from './attack-moves.js';
// One attack button: a deliberate tap/hold, with immediate contextual follow-ups.
// Held guard changes what the tap and the hold are (飛墨斬, 敕令 · 鎮); the simulation decides that
// from the hero's state when the input arrives, so the button itself stays the same.
export const HEAVY_HOLD=.24;
export function contextualAttack(game){
 const p=game.player;
 if(p.state==='dash')return 'light';
 if(p.stun<=0&&(['idle','guard'].includes(p.state)||p.state==='roll'&&p.counterWindow>0)){
  if(game.canExecute()||p.counterWindow>0)return 'heavy';
 }
 // Off a sprint there is no time to charge: the press itself is the leaping cut.
 if(game.canLeap?.())return 'light';
 return null;
}
// What the attack button will do right now, for its on-screen label.
export function attackLabel(game){const p=game.player;return game.canExecute()?'處決':p.counterWindow>0?'反擊':game.guardArt?.('light')?'飛墨':game.canLeap?.()?'躍斬':'攻擊';}
// The one-line prompt above the action bar: the move in hand, or what the next press would become.
export function comboHint(game,touch=false){
 const p=game.player,key=touch?'攻擊':' J';if(game.status!=='playing')return '';
 if(p.queuedFinisher)return `${PLAYER_MOVES[p.queuedFinisher].name} · 已接招`;
 const move=PLAYER_MOVES[p.move];
 if(p.state==='light'){if(move?.art)return move.name;const branch=`長按${key} · ${p.chain>=2?'迴風掃蕩':'挑月斬'}`;return ['twin','crash','leap'].includes(p.move)?`${move.name} · ${branch}`:branch;}
 if(p.state==='heavy')return ['rising','sweep','seal'].includes(p.move)?move.name:'';
 if(game.canExecute()||p.counterWindow>0)return '';
 if(game.guardArt?.('light'))return `短按${key} · ${PLAYER_MOVES.inkWave.name}`+(game.guardArt('heavy')?` ｜ 長按 · ${PLAYER_MOVES.seal.name}`:'');
 if(game.canLeap?.())return `按${key} · ${PLAYER_MOVES.leap.name}`;
 return '';
}
export function evasionAction(direction,yaw,dashCooldown=0){
 const length=Math.hypot(direction.x,direction.z);
 const forward=length>.1?(Math.sin(yaw)*direction.x+Math.cos(yaw)*direction.z)/length:0;
 // Diagonal, sideways and backward input retain invulnerable dodges. A cooling dash falls back to a forward dodge.
 return forward>.8&&dashCooldown<=0?'dash':'roll';
}
export class SimpleAttack{
 constructor(send){this.send=send;this.sources=new Set();this.age=0;this.fired=false;}
 press(source,game){
  if(game.status!=='playing'||this.sources.has(source))return;
  this.sources.add(source);if(this.sources.size>1)return;
  this.age=0;this.fired=false;const contextual=contextualAttack(game);
  if(contextual){this.fired=true;this.send(contextual);}
 }
 release(source,game,{cancel=false}={}){
  if(!this.sources.delete(source)||this.sources.size)return;
  if(!cancel&&!this.fired&&game.status==='playing')this.send(contextualAttack(game)||'light');
  this.age=0;this.fired=false;
 }
 update(dt,game){
  if(game.status!=='playing'){this.clear();return;}
  if(!this.sources.size||this.fired)return;
  this.age+=dt;
  if(this.age+1e-8>=HEAVY_HOLD){this.fired=true;this.send(contextualAttack(game)||'heavy');}
 }
 clear(){this.sources.clear();this.age=0;this.fired=false;}
 snapshot(){return {held:this.sources.size>0,charge:this.sources.size&&!this.fired?Math.min(1,this.age/HEAVY_HOLD):0,fired:this.fired};}
}
