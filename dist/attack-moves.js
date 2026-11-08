// One timeline drives both damage timing and the articulated combat pose.
const rest={hips:[0,0,0],chest:[0,0,0],head:[0,0,0],rightArm:[-.27,0,.06],rightForearm:[-.28,0,0],rightHand:[0,0,0],leftArm:[-.12,0,-.04],leftForearm:[-.1,0,0],rightLeg:[0,0,0],rightKnee:[0,0,0],leftLeg:[0,0,0],leftKnee:[0,0,0],body:[0,0,0],offset:[0,0,0]};
const pose=p=>({...rest,...p});
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function mix(a,b,t){const result={};for(const key of Object.keys(rest))result[key]=a[key].map((v,i)=>v+(b[key][i]-v)*t);return result;}
// Monotone Hermite curves retain velocity through contact without overshooting joints.
function tangent(prev,current,next,key,axis){
 if(!prev||!next)return 0;
 const a=(current[1][key][axis]-prev[1][key][axis])/(current[0]-prev[0]),b=(next[1][key][axis]-current[1][key][axis])/(next[0]-current[0]);
 return a*b<=0?0:2*a*b/(a+b);
}
export function sampleFrames(frames,time){
 if(time<=frames[0][0])return mix(frames[0][1],frames[0][1],0);
 for(let i=1;i<frames.length;i++){const end=frames[i],start=frames[i-1];if(time>end[0])continue;
  const span=end[0]-start[0],u=(time-start[0])/span,u2=u*u,u3=u2*u,result={};
  for(const key of Object.keys(rest))result[key]=start[1][key].map((v,k)=>(2*u3-3*u2+1)*v+(u3-2*u2+u)*span*tangent(frames[i-2],start,end,key,k)+(-2*u3+3*u2)*end[1][key][k]+(u3-u2)*span*tangent(start,end,frames[i+1],key,k));
  return result;
 }
 return mix(frames.at(-1)[1],frames.at(-1)[1],0);
}
function move(id,name,duration,impact,wind,contact,follow,extra={}){
 const sign=id==='reverse'?-1:1,heavy=['heavy','cleave'].includes(id);
 const w=pose(wind),c=pose(contact),f=pose(follow);
 // Pelvis drives the cut; shoulders follow, head stays on target, knees accept weight.
 for(const [p,stage] of [[w,-1],[c,.45],[f,1]]){
  p.hips=[p.hips[0]+(stage<0?-.05:.06),p.hips[1]*1.35,sign*stage*.035];
  p.head=[-.08,-p.chest[1]*.42,-p.chest[2]*.4];
  p.rightLeg=[p.rightLeg[0]-(stage<0?.12:.23),p.rightLeg[1],-.06];p.leftLeg=[p.leftLeg[0]+(stage<0?.14:.18),p.leftLeg[1],.045];
  p.rightKnee=[Math.max(p.rightKnee[0],stage<0?.18:.3),0,0];p.leftKnee=[Math.max(p.leftKnee[0],.14),0,0];
  p.offset=[sign*stage*.045,Math.min(p.offset[1],heavy?-.085:-.045),stage<0?-.05:.025];
  if(!['spin','sweep'].includes(id))p.body=[p.body[0]+(stage<0?-.035:.045),sign*stage*.065,p.body[2]];
 }
 const settle=mix(pose({}),f,.28);
 return{id,name,duration,impact,damage:21,posture:17,range:2.65,arc:1.15,lungeSpeed:1.8,lungeUntil:.17,trailStart:Math.max(.06,impact-.07),trailEnd:impact+.15,
  frames:[[0,pose({})],[Math.max(.035,impact-.13),w],[impact-.055,w],[impact,c],[impact+.075,f],[duration-.07,settle],[duration,pose({})]],...extra};
}
export const PLAYER_MOVES={
 dashCut:move('dashCut','疾風拔斬',.72,.23,
  {hips:[.08,-.32,0],chest:[.22,-.6,-.08],rightArm:[-.5,-.9,-.5],rightForearm:[-.9,0,0],rightHand:[-.3,0,-.3],leftArm:[.35,0,-.6],rightLeg:[-.5,0,0],leftLeg:[.32,0,0]},
  {hips:[.08,.2,0],chest:[.12,.35,.08],rightArm:[-1.2,.35,.35],rightForearm:[-.08,0,0],rightHand:[-.4,0,.2],leftArm:[-.65,0,-.6]},
  {hips:[0,.42,0],chest:[-.08,.75,.12],rightArm:[-1.85,.8,.8],rightForearm:[-.25,0,0],rightHand:[-.25,0,.3],leftArm:[.1,0,-.4]},
  {damage:32,posture:30,range:3.25,arc:1.55,lungeSpeed:7,lungeUntil:.2,trailStart:.11,trailEnd:.42}),
 diagonal:move('diagonal','斜斬',.58,.24,
  {hips:[0,-.2,0],chest:[-.08,-.5,-.1],rightArm:[-1.75,-.5,-.45],rightForearm:[-.85,0,-.1],leftArm:[-.4,0,-.3],rightLeg:[-.18,0,0],leftLeg:[.12,0,0]},
  {hips:[0,.12,0],chest:[.08,.2,.1],rightArm:[-.85,.4,.55],rightForearm:[-.2,0,0],rightHand:[-.35,0,.25],leftArm:[-.25,0,-.4]},
  {hips:[0,.2,0],chest:[.14,.7,.12],rightArm:[-.1,1.1,.95],rightForearm:[-.12,0,0],rightHand:[-.2,0,.2],leftArm:[.15,0,-.3]}),
 reverse:move('reverse','反手橫斬',.54,.21,
  {hips:[0,.22,0],chest:[.04,.65,.06],rightArm:[-.85,1.05,1.05],rightForearm:[-.55,0,0],leftArm:[.2,0,-.4],leftLeg:[-.16,0,0]},
  {hips:[0,-.1,0],chest:[0,-.15,-.08],rightArm:[-1.0,-.15,-.25],rightForearm:[-.12,0,0],rightHand:[-.6,0,-.35],leftArm:[-.5,0,-.25]},
  {hips:[0,-.24,0],chest:[.1,-.65,-.12],rightArm:[-.8,-.85,-.65],rightForearm:[-.18,0,0],rightHand:[-.55,0,-.4],leftArm:[-.4,0,-.15]}, {lungeSpeed:1.2,lungeUntil:.12}),
 cleave:move('cleave','迴身落刃',.72,.32,
  {hips:[0,-.35,0],chest:[-.14,-.65,-.12],rightArm:[-2.1,-.65,-.42],rightForearm:[-.65,0,0],rightHand:[-.1,0,0],leftArm:[-.8,0,-.4],rightLeg:[-.38,0,0],rightKnee:[.38,0,0],leftLeg:[.16,0,0],offset:[0,-.035,0]},
  {hips:[.12,.16,0],chest:[.25,.25,.12],rightArm:[-.8,.3,.3],rightForearm:[-.1,0,0],rightHand:[-.25,0,0],leftArm:[.2,0,-.4],rightLeg:[-.25,0,0],rightKnee:[.24,0,0],leftLeg:[.28,0,0],offset:[0,-.06,0]},
  {hips:[.1,.32,0],chest:[.2,.7,.13],rightArm:[-1.05,1.25,1.0],rightForearm:[-.12,0,0],leftArm:[.22,0,-.35],rightLeg:[-.22,0,0],leftLeg:[.22,0,0],offset:[0,-.06,0]}, {damage:26,lungeSpeed:3.0,lungeUntil:.23}),
 rising:move('rising','挑月斬',.68,.24,
  {hips:[.12,-.24,0],chest:[.28,-.4,-.12],rightArm:[.25,-.55,-.35],rightForearm:[-.5,0,0],rightHand:[-.4,0,-.3],leftArm:[.2,0,-.5],rightLeg:[-.42,0,0],rightKnee:[.48,0,0]},
  {hips:[-.04,.12,0],chest:[-.12,.22,.04],rightArm:[-1.45,.2,.12],rightForearm:[-.1,0,0],rightHand:[-.25,0,.1],leftArm:[-.5,0,-.5]},
  {hips:[-.06,.28,0],chest:[-.18,.45,.08],rightArm:[-2.35,.45,.28],rightForearm:[-.35,0,0],leftArm:[-.7,0,-.3]},
  {cost:22,damage:34,posture:38,range:3.05,arc:1.3,lungeSpeed:3.6,lungeUntil:.2,trailStart:.13,trailEnd:.42}),
 sweep:move('sweep','迴風掃蕩',.86,.32,
  {hips:[.04,-.32,0],chest:[.08,-.62,-.06],rightArm:[-.65,-.8,-.8],rightForearm:[-.2,0,0],leftArm:[-.45,0,.4],body:[0,-.5,0],rightLeg:[-.3,0,0]},
  {hips:[.05,.16,0],chest:[.06,.25,.02],rightArm:[-1.1,.4,-.75],rightForearm:[-.05,0,0],rightHand:[-.4,0,-.2],leftArm:[-.65,0,.55],body:[0,2.8,0]},
  {hips:[0,.25,0],chest:[.1,.45,.06],rightArm:[-.7,.8,.55],rightForearm:[-.2,0,0],leftArm:[-.25,0,.35],body:[0,Math.PI*2,0]},
  {cost:26,damage:32,posture:30,range:3.8,arc:Math.PI,lungeSpeed:1.5,lungeUntil:.15,trailStart:.17,trailEnd:.51}),
 heavy:move('heavy','蓄勢破甲',1.05,.47,
  {hips:[-.08,-.28,0],chest:[-.2,-.45,-.05],rightArm:[-2.5,-.25,-.12],rightForearm:[-.8,0,0],leftArm:[-1.4,-.2,-.4],leftForearm:[-.75,0,0],rightLeg:[-.28,0,0],rightKnee:[.35,0,0],leftLeg:[.25,0,0],leftKnee:[.15,0,0],offset:[0,-.09,0]},
  {hips:[.15,.14,0],chest:[.36,.25,.08],rightArm:[-.6,.25,.15],rightForearm:[-.08,0,0],rightHand:[-.3,0,0],leftArm:[.1,0,-.5],rightLeg:[-.35,0,0],rightKnee:[.28,0,0],leftLeg:[.32,0,0],offset:[0,-.1,0]},
  {hips:[.14,.2,0],chest:[.48,.42,.1],rightArm:[.25,.4,.2],rightForearm:[-.05,0,0],leftArm:[.35,0,-.45],rightLeg:[-.25,0,0],leftLeg:[.25,0,0],offset:[0,-.08,0]}, {damage:38,posture:46,range:3,arc:1.05,lungeSpeed:2.3,lungeUntil:.2}),
 spin:move('spin','迴身破墨',1.25,.52,
  {hips:[0,-.3,0],chest:[-.08,-.5,0],rightArm:[-1.2,-.55,-.65],rightForearm:[-.18,0,0],leftArm:[-.5,0,.3],body:[0,-.6,0],rightLeg:[-.2,0,0]},
  {hips:[0,.1,0],chest:[.08,.2,0],rightArm:[-1.2,.45,-.8],rightForearm:[-.08,0,0],rightHand:[-.5,0,-.3],leftArm:[-.6,0,.6],body:[0,3.2,0],offset:[0,.025,0]},
  {hips:[0,.2,0],chest:[.12,.45,0],rightArm:[-.8,1,.65],rightForearm:[-.2,0,0],leftArm:[-.3,0,.4],body:[0,Math.PI*2,0]}, {damage:75,posture:60,range:5.2,arc:Math.PI,trailStart:.25,trailEnd:.77})
};
// Follow-up and execution share familiar blade arcs with their own commitment timings.
for(const [id,name,source,duration,impact,extra] of [
 ['riposte','乘隙反斬','reverse',.68,.23,{damage:52,posture:54,range:3.45,lungeSpeed:7,lungeUntil:.22}],
 ['execute','鎮魂處決','heavy',.94,.4,{damage:110,posture:0,range:3.4,lungeSpeed:3,lungeUntil:.2}]
]){
 const src=PLAYER_MOVES[source];PLAYER_MOVES[id]={...src,...extra,id,name,duration,impact,trailStart:impact-.11,trailEnd:impact+.13,frames:src.frames.map(([t,p])=>[t<=src.impact?t*impact/src.impact:impact+(t-src.impact)*(duration-impact)/(src.duration-src.impact),structuredClone(p)])};
}
// Keep the rotation at 2π in recovery; interpolating to zero would reverse the spin.
for(const id of ['spin','sweep']){PLAYER_MOVES[id].frames.at(-1)[1].body=[0,Math.PI*2,0];PLAYER_MOVES[id].frames.at(-2)[1].body=[0,Math.PI*2,0];}
export function playerMove(actor){return PLAYER_MOVES[actor.move]||PLAYER_MOVES[actor.state==='heavy'?'heavy':actor.state==='special'?'spin':['diagonal','reverse','cleave'][((actor.chain||1)-1)%3]];}
export function samplePlayerAttack(actor){return sampleFrames(playerMove(actor).frames,Math.max(0,actor.total-actor.timer));}
const monsterRest=pose({rightArm:[-.08,0,0],leftArm:[-.08,0,0],rightForearm:[-.1,0,0],leftForearm:[-.1,0,0]});
const slamWind=pose({chest:[-.2,0,0],head:[-.12,0,0],rightArm:[-2.3,0,-.08],leftArm:[-2.3,0,.08],rightForearm:[-.5,0,0],leftForearm:[-.5,0,0],rightLeg:[-.12,0,0],leftLeg:[-.12,0,0],offset:[0,.06,0]});
const slamHit=pose({hips:[.12,0,0],chest:[.55,0,0],head:[.18,0,0],rightArm:[-.45,0,.1],leftArm:[-.45,0,-.1],rightForearm:[-.12,0,0],leftForearm:[-.12,0,0],rightLeg:[-.22,0,0],leftLeg:[-.22,0,0],rightKnee:[.35,0,0],leftKnee:[.35,0,0],offset:[0,-.14,0]});
export function monsterVariant(actor){return actor.variant||(actor.kind==='slam'?'slam':actor.phase%2?'claw-left':'claw-right');}
export function sampleMonsterAttack(actor){
 const variant=monsterVariant(actor),left=variant==='claw-left';let wind,hit,follow;
 if(variant==='slam'||variant==='fissure'){wind=slamWind;hit=slamHit;follow=pose({...slamHit,chest:[.65,0,0],rightArm:[.05,0,.12],leftArm:[.05,0,-.12],offset:[0,-.16,0]});}
 else{
  const arm=left?'leftArm':'rightArm',fore=left?'leftForearm':'rightForearm',other=left?'rightArm':'leftArm',sign=left?-1:1;
  wind=pose({hips:[0,-sign*.22,0],chest:[-.05,-sign*.55,-sign*.1],[arm]:[-.85,-sign*.6,-sign*.9],[fore]:[-.7,0,0],[other]:[-.2,0,sign*.15],head:[0,sign*.15,0]});
  hit=pose({hips:[0,sign*.12,0],chest:[.18,sign*.25,sign*.08],[arm]:[-1.1,sign*.65,sign*.35],[fore]:[-.1,0,0],[other]:[.1,0,sign*.2],offset:[0,-.04,0]});
  follow=pose({hips:[0,sign*.2,0],chest:[.2,sign*.6,sign*.12],[arm]:[-.65,sign*1.1,sign*.75],[fore]:[-.15,0,0],[other]:[.2,0,sign*.2]});
 }
 if(actor.state==='windup')return mix(monsterRest,wind,smooth((1-actor.timer/actor.total)/.78));
 return sampleFrames([[0,wind],[actor.total*.27,wind],[actor.total*.4,hit],[actor.total*.58,follow],[actor.total,monsterRest]],actor.total-actor.timer);
}

// The swordsman's contact pose coincides with the simulation's 40% attack hit.
export function sampleSwordsmanAttack(actor){
 const source=PLAYER_MOVES[['slash-left','sword-cross'].includes(actor.variant)?'reverse':'diagonal'];
 const thrust=actor.kind==='thrust';
 const wind=thrust?pose({chest:[-.06,-.35,0],rightArm:[-1.2,-.4,.12],rightForearm:[-1.5,0,0],rightHand:[-1.1,0,0],leftArm:[-.2,0,-.4],rightLeg:[.16,0,0]}):sampleFrames(source.frames,source.impact-.055);
 const contact=thrust?pose({chest:[.18,.1,0],rightArm:[-1.48,.02,0],rightForearm:[0,0,0],rightHand:[0,0,0],leftArm:[.4,0,-.3],rightLeg:[-.3,0,0],leftLeg:[.25,0,0],offset:[0,-.04,0]}):sampleFrames(source.frames,source.impact);
 const follow=thrust?contact:sampleFrames(source.frames,source.impact+.075);
 if(actor.state==='windup')return mix(pose({}),wind,smooth((1-actor.timer/actor.total)/.82));
 return sampleFrames([[0,wind],[actor.total*.27,wind],[actor.total*.4,contact],[actor.total*(thrust?.8:.58),follow],[actor.total,pose({})]],actor.total-actor.timer);
}

// Preserve total attack travel but concentrate the step around the blade's release.
export function attackTravel(move,age){
 const start=Math.max(0,move.impact-.13),end=move.impact+.055,u=Math.max(0,Math.min(1,(age-start)/(end-start)));
 return move.lungeSpeed*move.lungeUntil*(1-Math.pow(1-u,3));
}
