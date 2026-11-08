// One attack button: a deliberate tap/hold, with immediate contextual follow-ups.
export const HEAVY_HOLD=.24;
export function contextualAttack(game){
 const p=game.player;
 if(p.state==='dash')return 'light';
 if(p.stun<=0&&(['idle','guard'].includes(p.state)||p.state==='roll'&&p.counterWindow>0)){
  if(game.canExecute()||p.counterWindow>0)return 'heavy';
 }
 return null;
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
