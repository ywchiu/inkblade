import { PLAYER_MOVES } from './attack-moves.js';

export const AUDIO_DEFAULTS=Object.freeze({music:.38,effects:.72,voice:.9});
export const AUDIO_FILES=Object.freeze(['exploration','battle','whoosh-1','whoosh-2','cloth-1','cloth-2','draw','heal','hit-1','hit-2','heavy-hit','metal-1','metal-2','bell','stone','step-1','step-2','step-3','wolf-growl']);
export const VOICE_LIMIT=12;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function audioSettings(value={}){return Object.fromEntries(Object.entries(AUDIO_DEFAULTS).map(([k,v])=>[k,typeof value?.[k]==='number'&&Number.isFinite(value[k])?clamp(value[k],0,1):v]));}
export function musicFor(game,mode){if(mode!=='playing'||game.status!=='playing'||game.cleared)return 'exploration';return game.targets().some(e=>e.hp>0&&Math.hypot(e.x-game.player.x,e.z-game.player.z)<15)?'battle':'exploration';}
// Sound events share one family cooldown so a six-target cut remains a single impact.
export function cueFor(e){
 switch(e.type){
  case 'hit':case 'special-hit':case 'counter-hit':case 'execution-hit':return {family:'impact',sample:e.heavy||e.type!=='hit'?'heavy-hit':'hit',gain:e.heavy?.85:.65,cooldown:.055,duck:true};
  case 'hurt':return e.blocked?null:{family:'hurt',sample:'heavy-hit',gain:.78,rate:.88,cooldown:.09,duck:true};
  case 'block':return {family:'metal',sample:'metal',gain:.48,cooldown:.07};
  case 'parry':return {family:'metal',sample:'metal',gain:.85,rate:1.08,cooldown:.09,duck:true};
  case 'dash':case 'roll':return {family:'cloth',sample:'cloth',gain:e.type==='dash'?.5:.35,rate:e.type==='dash'?.85:1.05,cooldown:.1};
  case 'enemy-swing':return ['bite','pounce'].includes(e.kind)?{family:'wolf',sample:'wolf-growl',gain:e.kind==='pounce'?.45:.28,rate:e.kind==='pounce'?.9:1.08,cooldown:.6}:{family:'enemy-swing',sample:e.kind==='slam'?'cloth':'whoosh',gain:.3,cooldown:.07};
  case 'special-release':return {family:'ultimate',sample:'stone',gain:.7,rate:1.12,cooldown:.2,duck:true};
  // The hero's ground-shaking moves and ink arts, from samples already shipped: stone for what hits the ground, a drawn blade for the crescent.
  case 'art':return e.art==='inkWave'?{family:'art',sample:'draw',gain:.5,rate:1.3,cooldown:.1}:e.art==='seal'?{family:'art',sample:'stone',gain:.74,rate:.9,cooldown:.2,duck:true}:{family:'art',sample:'stone',gain:e.art==='leap'?.56:.46,rate:e.art==='leap'?1.15:1.32,cooldown:.15};
  case 'slam':return {family:'stone',sample:'stone',gain:.78,rate:.75,cooldown:.18,duck:true};
  case 'projectile-release':return e.style==='howl'?{family:'wolf',sample:'wolf-growl',gain:.48,rate:.82,cooldown:.6}:{family:'projectile',sample:'whoosh',gain:.4,rate:.7,cooldown:.12};
  case 'stagger':case 'guard-break':return {family:'break',sample:'metal',gain:.45,rate:.7,cooldown:.15};
  case 'healed':return {family:'heal',sample:'heal',gain:.55,cooldown:.3};
  case 'perfect-dodge':return {family:'dodge',sample:'draw',gain:.32,rate:1.1,cooldown:.3};
  case 'victory':case 'gate-open':return {family:'result',sample:'bell',gain:.4,rate:.9,cooldown:1};
  case 'defeat':return {family:'result',sample:'bell',gain:.3,rate:.55,cooldown:1};
  case 'rubbing':return {family:'find',sample:'bell',gain:.34,rate:1.5,cooldown:.5};
  case 'shrine':return {family:'heal',sample:'heal',gain:.5,rate:.85,cooldown:.3};
  case 'ambush':return {family:'stone',sample:'stone',gain:.45,rate:1.2,cooldown:.4};
  case 'burst-warn':return {family:'projectile',sample:'whoosh',gain:.35,rate:.55,cooldown:.2};
  case 'phase-break':return {family:'result',sample:'bell',gain:.5,rate:.6,cooldown:1};
  default:return null;
 }
}

export class GameAudio {
 constructor(options={}){
  this.contextFactory=options.contextFactory||(()=>new AudioContext());this.fetcher=options.fetcher||((...args)=>fetch(...args));this.random=options.random||Math.random;
  try{this.storage=options.storage===undefined?globalThis.localStorage:options.storage;this.settings=audioSettings(JSON.parse(this.storage?.getItem('inkblade.audio.v1')||'{}'));}catch{this.settings=audioSettings();}
  this.buffers=new Map();this.failed=[];this.voices=new Set();this.musicLoops=new Map();this.cooldowns=new Map();this.lastVariant=new Map();this.track='exploration';this.hidden=false;this.paused=false;this.duckUntil=0;this.played=0;this.playedSamples={};this.dropped=0;this.peakVoices=0;this.walkDistance=0;this.pendingSwing=null;this.state='not-started';this.mixTargets=new Map();this.loadPromise=null;this.lastPlayer=null;
 }
 async unlock(){
  try{
   if(!this.ctx){this.ctx=this.contextFactory();this.buildGraph();}
   // Resume synchronously from the gesture, before awaiting any network operation.
   await this.ctx.resume();this.state='loading';
   if(!this.loadPromise)this.loadPromise=this.load();
   await this.loadPromise;this.state=this.failed.length?'partial':'ready';this.applyMix();return true;
  }catch(error){this.state='unavailable';this.error=error.message;return false;}
 }
 buildGraph(){const c=this.ctx;
  this.master=c.createGain();this.dialogue=c.createGain();this.dialogue.connect(this.master);this.effects=c.createGain();this.music=c.createGain();this.sfxFilter=c.createBiquadFilter();this.sfxFilter.type='lowpass';this.sfxFilter.frequency.value=7200;
  this.compressor=c.createDynamicsCompressor();Object.assign(this.compressor.threshold,{value:-8});this.compressor.knee.value=8;this.compressor.ratio.value=12;this.compressor.attack.value=.003;this.compressor.release.value=.18;
  this.analyser=c.createAnalyser();this.analyser.fftSize=512;this.meter=new Float32Array(512);
  this.effects.connect(this.sfxFilter).connect(this.master);this.music.connect(this.master);this.master.connect(this.compressor).connect(this.analyser).connect(c.destination);
  this.master.gain.value=this.hidden?0:.8;this.effects.gain.value=this.settings.effects;this.music.gain.value=this.settings.music;this.applyMix();
 }
 async load(){
  await Promise.all(AUDIO_FILES.map(async name=>{try{
   const response=await this.fetcher(`./assets/audio/${name}.ogg`,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());this.buffers.set(name,buffer);
   if(name==='exploration'||name==='battle')this.startMusic(name,buffer);
  }catch(error){this.failed.push({name,reason:error.message});}}));
 }
 startMusic(name,buffer){if(this.musicLoops.has(name))return;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain).connect(this.music);source.start();this.musicLoops.set(name,{source,gain});this.applyMix();}
 ramp(param,value,seconds=.08){if(this.mixTargets.get(param)===value)return;this.mixTargets.set(param,value);const now=this.ctx.currentTime;param.cancelScheduledValues(now);param.setTargetAtTime(value,now,seconds);}
 applyMix(){if(!this.ctx)return;
  this.ramp(this.master.gain,this.hidden?0:.8,.025);this.ramp(this.dialogue.gain,this.settings.voice,.025);this.ramp(this.effects.gain,this.paused?0:this.settings.effects,.025);
  const duck=this.dialogueActive?.35:this.ctx.currentTime<this.duckUntil?.54:1;
  this.ramp(this.music.gain,this.settings.music*(this.paused?.24:1)*duck,.10);
  this.playingTrack=this.musicLoops.has(this.track)?this.track:this.musicLoops.keys().next().value;
  for(const [name,loop]of this.musicLoops)this.ramp(loop.gain.gain,name===this.playingTrack?1:0,.42);
 }
 setVolume(channel,value){if(!['music','effects','voice'].includes(channel)||!Number.isFinite(value))return;this.settings[channel]=clamp(value,0,1);try{this.storage?.setItem('inkblade.audio.v1',JSON.stringify(this.settings));}catch{}this.applyMix();}
 setHidden(hidden){this.hidden=hidden;if(hidden){this.pendingSwing=null;this.stopEffects();}this.applyMix();}
 reset(){this.stopEffects();this.pendingSwing=null;this.lastPlayer=null;this.walkDistance=0;this.cooldowns.clear();}
 stopEffects(){for(const voice of [...this.voices]){try{voice.source.stop();}catch{}this.release(voice);}}
 release(voice){if(!this.voices.delete(voice))return;voice.source.disconnect();voice.gain.disconnect();voice.pan.disconnect();}
 variant(name){const sets={whoosh:['whoosh-1','whoosh-2'],hit:['hit-1','hit-2'],metal:['metal-1','metal-2'],cloth:['cloth-1','cloth-2'],step:['step-1','step-2','step-3']};const choices=sets[name];if(!choices)return name;const next=((this.lastVariant.get(name)??-1)+1)%choices.length;this.lastVariant.set(name,next);return choices[next];}
 play(name,{gain=.5,rate=1,pan=0,family=name,cooldown=.04}={}){
  if(!this.ctx||this.ctx.state!=='running'||this.hidden||this.paused||this.settings.effects<=0)return false;
  const now=this.ctx.currentTime;if(now-(this.cooldowns.get(family)??-Infinity)<cooldown||this.voices.size>=VOICE_LIMIT){this.dropped++;return false;}
  const sample=this.variant(name),buffer=this.buffers.get(sample);if(!buffer)return false;
  const source=this.ctx.createBufferSource(),level=this.ctx.createGain(),position=this.ctx.createStereoPanner();source.buffer=buffer;source.playbackRate.value=rate*(.96+this.random()*.08);level.gain.value=gain;position.pan.value=clamp(pan,-.8,.8);
  source.connect(level).connect(position).connect(this.effects);const voice={source,gain:level,pan:position};this.voices.add(voice);source.onended=()=>this.release(voice);source.start();this.cooldowns.set(family,now);this.played++;this.playedSamples[sample]=(this.playedSamples[sample]||0)+1;this.peakVoices=Math.max(this.peakVoices,this.voices.size);return true;
 }
 onEvent(event,game){
  if(['swing','special'].includes(event.type)){this.pendingSwing={actor:game.player,move:event.move||game.player.move};if(event.type==='special')this.play('draw',{gain:.62,rate:.72,family:'ultimate',cooldown:.3});if(event.art==='seal')this.play('draw',{gain:.5,rate:.84,family:'art',cooldown:.3});return;}
  const cue=cueFor(event);if(!cue)return;const p=game.player,dx=(event.x??p.x)-p.x,dz=(event.z??p.z)-p.z,d=Math.hypot(dx,dz);if(d>20)return;
  const pan=(dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw))/8;
  if(this.play(cue.sample,{...cue,gain:cue.gain/(1+d*.07),pan})&&cue.duck){this.duckUntil=this.ctx.currentTime+.22;this.applyMix();}
 }
 update(game,{mode='playing',paused=false,dt=0}={}){
  if(!this.ctx)return;
  if(paused&&!this.paused)this.stopEffects();this.paused=paused;this.track=musicFor(game,mode);this.applyMix();
  const p=game.player;
  if(mode!=='playing'||paused||this.hidden||game.status!=='playing'){this.lastPlayer=null;this.walkDistance=0;return;}
  if(this.pendingSwing){const pending=this.pendingSwing,move=PLAYER_MOVES[pending.move],cuts=move?.hits&&!move.charge?move.hits.filter(h=>!h.shock).map(h=>h.at):[move?.impact],index=pending.index||0;
   if(pending.actor!==p||p.move!==pending.move||!['light','heavy','special'].includes(p.state)){this.pendingSwing=null;}
   // One swish per cut of a move that cuts twice; the ultimate keeps its single closing one.
   else if(move&&p.total-p.timer>=Math.max(.025,cuts[index]-.12)){this.play('whoosh',{gain:p.state==='light'?.38:.58,rate:p.state==='light'?1:.82,family:'hero-swing',cooldown:.06});pending.index=index+1;if(pending.index>=cuts.length)this.pendingSwing=null;}}
  if(this.lastPlayer&&['idle','guard'].includes(p.state)&&p.speed>1&&dt>0){const travel=Math.hypot(p.x-this.lastPlayer.x,p.z-this.lastPlayer.z);if(travel<1){this.walkDistance+=travel;if(this.walkDistance>(p.speed>4?1.55:1.2)){this.walkDistance=0;this.play('step',{gain:p.speed>4?.23:.15,rate:p.speed>4?1.06:.94,family:'footstep',cooldown:.18});}}}else this.walkDistance=0;
  this.lastPlayer={x:p.x,z:p.z};
 }
 snapshot(){let peak=0,rms=0;if(this.analyser){this.analyser.getFloatTimeDomainData(this.meter);for(const x of this.meter){peak=Math.max(peak,Math.abs(x));rms+=x*x;}rms=Math.sqrt(rms/this.meter.length);}return {state:this.state,context:this.ctx?.state||'not-started',settings:{...this.settings},loaded:this.buffers.size,total:AUDIO_FILES.length,failed:[...this.failed],error:this.error||null,track:this.track,playingTrack:this.playingTrack||null,hidden:this.hidden,paused:this.paused,voices:this.voices.size,peakVoices:this.peakVoices,played:this.played,playedSamples:{...this.playedSamples},dropped:this.dropped,musicLoops:this.musicLoops.size,peak,rms};}
}
