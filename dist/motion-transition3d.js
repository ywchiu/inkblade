const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
// Decaying offsets preserve the outgoing pose without delaying the contact timeline.
export function transitionPose(model,actor,pose,dt,freshImpact=false,previousBody=null,previousPosition=null){
 const key=actor.state+':'+(actor.move||actor.variant||'');
 let state=model.motionTransition;
 if(!state||freshImpact||actor.state==='dead'){model.motionTransition={key,age:1,offsets:null};return;}
 if(state.key!==key){
  state=model.motionTransition={key,age:0,duration:['roll','dash'].includes(actor.state)?.065:actor.state==='windup'?.10:.12,offsets:new Map()};
  if(previousBody){state.bodyOffset=[previousBody.x,previousBody.y,previousBody.z].map((v,i)=>wrap(v-[model.body.rotation.x,model.body.rotation.y,model.body.rotation.z][i]));state.positionOffset=previousPosition.clone().sub(model.body.position);}
  for(const [bone,target] of pose)state.offsets.set(bone,target.map((v,i)=>wrap([bone.rotation.x,bone.rotation.y,bone.rotation.z][i]-v)));
 }
 if(!state.offsets)return;
 state.age+=dt;const u=Math.min(1,state.age/state.duration),weight=1-u*u*(3-2*u);
 for(const [bone,target] of pose){const offset=state.offsets.get(bone);if(offset)for(let i=0;i<3;i++)target[i]+=offset[i]*weight;}
 if(state.bodyOffset){model.body.rotation.x+=state.bodyOffset[0]*weight;model.body.rotation.y+=state.bodyOffset[1]*weight;model.body.rotation.z+=state.bodyOffset[2]*weight;model.body.position.addScaledVector(state.positionOffset,weight);}
 if(u===1)state.offsets=null;
}
