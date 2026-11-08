// Single, cancelable dialogue lane. Combat pause leaves speech audible; tab blur pauses it.
export class DialogueAudio{
 constructor(audio,{fetcher=(...args)=>fetch(...args)}={}){this.audio=audio;this.fetcher=fetcher;this.cache=new Map();this.serial=0;this.source=null;this.id=null;this.state='idle';this.offset=0;this.startedAt=0;this.played=0;this.error=null;this.paused=false;}
 detach(){if(!this.source)return;const source=this.source;this.source=null;source.onended=null;try{source.stop();}catch{}source.disconnect();this.audio.dialogueActive=false;this.audio.applyMix();}
 stop(){this.serial++;this.detach();this.id=null;this.state='idle';this.offset=0;this.paused=false;this.error=null;}
 async buffer(id){if(!this.cache.has(id)){const promise=(async()=>{const r=await this.fetcher(`./assets/audio/dialogue/${id}.ogg`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return this.audio.ctx.decodeAudioData(await r.arrayBuffer());})();this.cache.set(id,promise);promise.catch(()=>this.cache.delete(id));}return this.cache.get(id);}
 async play(id,{offset=0}={}){
  this.stop();if(!id)return false;this.id=id;this.offset=offset;this.state='loading';const token=this.serial;
  try{
   if(!await this.audio.unlock())throw new Error('audio unavailable');
   if(token!==this.serial)return false;
   const buffer=await this.buffer(id);if(token!==this.serial)return false;
   if(this.audio.hidden){this.paused=true;this.state='paused';return false;}
   if(offset>=buffer.duration){this.state='ended';return true;}
   const source=this.audio.ctx.createBufferSource();source.buffer=buffer;source.connect(this.audio.dialogue);this.source=source;this.startedAt=this.audio.ctx.currentTime;
   source.onended=()=>{if(token!==this.serial||this.source!==source)return;source.disconnect();this.source=null;this.state='ended';this.audio.dialogueActive=false;this.audio.applyMix();};
   this.audio.dialogueActive=true;this.audio.applyMix();source.start(0,offset);this.state='playing';this.played++;return true;
  }catch(error){if(token===this.serial){this.error=error.message;this.state='failed';this.detach();}return false;}
 }
 pause(){if(!this.id||['ended','failed','idle','paused'].includes(this.state))return;if(this.source)this.offset+=Math.max(0,this.audio.ctx.currentTime-this.startedAt);this.serial++;this.detach();this.paused=true;this.state='paused';}
 resume(){if(!this.paused||!this.id)return Promise.resolve(false);return this.play(this.id,{offset:this.offset});}
 snapshot(){return {id:this.id,state:this.state,active:!!this.source,loaded:this.cache.size,played:this.played,offset:this.offset,error:this.error};}
}
