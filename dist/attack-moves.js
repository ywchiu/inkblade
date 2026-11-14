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
// 墨破山河. Poses are authored directly: the timeline is longer than a cut and has its own beats.
function ultimate(){
 const TAU=Math.PI*2;
 const gather=pose({hips:[-.06,-.2,0],chest:[-.1,-.28,-.03],head:[-.06,.28,0],rightArm:[-1.05,.85,.1],rightForearm:[-.75,0,0],leftArm:[-.95,.2,.2],leftForearm:[-1.1,0,0],rightLeg:[-.4,0,-.1],rightKnee:[.62,0,0],leftLeg:[.3,0,.12],leftKnee:[.5,0,0],offset:[0,-.2,-.06]});
 const coiled=pose({...gather,hips:[-.1,-.3,0],chest:[-.16,-.4,-.05],head:[-.08,.4,0],rightArm:[-1.15,1,.1],rightForearm:[-.9,0,0],body:[0,-.22,0],offset:[0,-.24,-.08]});
 const whirl=(turn,lift)=>pose({hips:[.04,.16,0],chest:[.08,.3,.03],head:[-.05,-.2,0],rightArm:[-1.25+lift,.5,-.85],rightForearm:[-.08,0,0],rightHand:[-.45,0,-.25],leftArm:[-.7,0,.65],leftForearm:[-.3,0,0],rightLeg:[-.3,0,-.1],rightKnee:[.4,0,0],leftLeg:[.24,0,.1],leftKnee:[.3,0,0],body:[0,turn,0],offset:[0,-.1,0]});
 // The closing cut is a leap: up off the ground with the blade overhead, then down through the target.
 const raised=pose({hips:[-.1,-.2,0],chest:[-.3,-.3,-.04],head:[.1,.2,0],rightArm:[-2.75,-.2,-.1],rightForearm:[-.75,0,0],leftArm:[-2.2,.2,.3],leftForearm:[-.9,0,0],rightLeg:[-.5,0,-.08],rightKnee:[.9,0,0],leftLeg:[.1,0,.08],leftKnee:[.7,0,0],body:[0,TAU*2,0],offset:[0,.55,-.05]});
 const cleave=pose({hips:[.2,.16,0],chest:[.55,.3,.08],head:[-.2,-.2,0],rightArm:[-.35,.3,.18],rightForearm:[-.05,0,0],rightHand:[-.3,0,0],leftArm:[.2,0,-.5],rightLeg:[-.75,0,-.1],rightKnee:[.8,0,0],leftLeg:[.5,0,.1],leftKnee:[.2,0,0],body:[.08,TAU*2,0],offset:[0,-.24,.18]});
 const settle=pose({...mix(pose({}),cleave,.3),body:[0,TAU*2,0]}),end=pose({body:[0,TAU*2,0]});
 return{id:'spin',name:'墨破山河',duration:2.4,charge:.9,impact:1.75,damage:75,posture:60,range:5.2,arc:Math.PI,lungeSpeed:1.8,lungeUntil:.17,trailStart:.92,trailEnd:1.9,
  // Flurry cuts chip, the closing cut carries the weight; together they are the move's damage and posture.
  hits:[{at:.98,damage:8,posture:6},{at:1.1,damage:8,posture:6},{at:1.22,damage:8,posture:6},{at:1.34,damage:8,posture:6},{at:1.75,damage:43,posture:36,final:true}],
  frames:[[0,pose({})],[.2,gather],[.82,coiled],[.9,coiled],[1.02,whirl(TAU*.5,0)],[1.14,whirl(TAU,.25)],[1.26,whirl(TAU*1.5,0)],[1.38,whirl(TAU*2,.3)],[1.58,raised],[1.75,cleave],[1.98,cleave],[2.3,settle],[2.4,end]]};
}
// Pelvis drives the cut; shoulders follow, head stays on target, knees accept weight.
// The windup sits back on a bent rear leg and coils the shoulders; contact drops into a
// deep front-leg lunge so the whole body, not just the arm, travels through the cut.
// `sign` is the side the cut travels to (-1 for a backhand), `turn` lets the body lean with it.
function shape(wind,contact,follow,{sign=1,heavy=false,turn=true}={}){
 const w=pose(wind),c=pose(contact),f=pose(follow);
 for(const [p,stage] of [[w,-1],[c,.45],[f,1]]){
  const coil=stage<0,power=heavy?1.2:1;
  p.chest=[p.chest[0]+(coil?-.07:.09),p.chest[1]*1.22,p.chest[2]*1.2];
  p.hips=[p.hips[0]+(coil?-.05:.06),p.hips[1]*1.6,sign*stage*.045];
  p.head=[-.08,-(p.chest[1]+p.hips[1])*.62,-p.chest[2]*.4];
  p.rightLeg=[p.rightLeg[0]-(coil?.1:.46*power),p.rightLeg[1],-.09];p.leftLeg=[p.leftLeg[0]+(coil?.08:.4*power),p.leftLeg[1],.1];
  p.rightKnee=[Math.max(p.rightKnee[0],coil?.3:.6*power),0,0];p.leftKnee=[Math.max(p.leftKnee[0],coil?.44:.18),0,0];
  p.offset=[sign*stage*.05,Math.min(p.offset[1],coil?-.07:heavy?-.2:-.15),coil?-.1:.15];
  if(turn)p.body=[p.body[0]+(coil?-.05:.08),sign*stage*.08,p.body[2]];
 }
 return [w,c,f];
}
function move(id,name,duration,impact,wind,contact,follow,{backhand=id==='reverse',weighty=['heavy','cleave'].includes(id),...extra}={}){
 const [w,c,f]=shape(wind,contact,follow,{sign:backhand?-1:1,heavy:weighty,turn:!['spin','sweep'].includes(id)});
 // Hold the finished cut for a beat before relaxing: the pause is what reads as control.
 const held={...mix(f,pose({}),.08),body:f.body,offset:f.offset},settle=mix(pose({}),f,.3),followAt=impact+.075,holdAt=followAt+Math.min(.15,(duration-.07-followAt)*.55);
 return{id,name,duration,impact,damage:21,posture:17,range:2.65,arc:1.15,lungeSpeed:1.8,lungeUntil:.17,trailStart:Math.max(.06,impact-.07),trailEnd:impact+.15,
  frames:[[0,pose({})],[Math.max(.035,impact-.13),w],[impact-.055,w],[impact,c],[followAt,f],[holdAt,held],[duration-.07,settle],[duration,pose({})]],...extra};
}
// 雙燕迴翔. Two cuts in one move: a level cut out to the left, then the blade wheels back
// rising to the right. Each lands as its own hit.
function twin(){
 const first=.2,second=.44,duration=.84;
 const [w1,c1,f1]=shape(
  {hips:[0,-.24,0],chest:[.02,-.6,-.06],rightArm:[-1.05,-.85,-.7],rightForearm:[-.55,0,0],rightHand:[-.3,0,-.3],leftArm:[-.45,0,-.3],rightLeg:[-.16,0,0]},
  {hips:[0,.1,0],chest:[.04,.16,.06],rightArm:[-1.15,.2,.2],rightForearm:[-.1,0,0],rightHand:[-.45,0,.2],leftArm:[-.3,0,-.4]},
  {hips:[0,.22,0],chest:[.06,.6,.1],rightArm:[-.95,1.0,.95],rightForearm:[-.3,0,0],rightHand:[-.3,0,.3],leftArm:[.15,0,-.35]});
 const [w2,c2,f2]=shape(
  {hips:[.04,.26,0],chest:[.14,.7,.1],rightArm:[-.45,1.0,1.2],rightForearm:[-.5,0,0],rightHand:[-.2,0,.3],leftArm:[.2,0,-.4],leftLeg:[-.14,0,0]},
  {hips:[0,-.1,0],chest:[-.02,-.14,-.06],rightArm:[-1.25,-.1,-.2],rightForearm:[-.1,0,0],rightHand:[-.55,0,-.3],leftArm:[-.5,0,-.3]},
  {hips:[-.04,-.26,0],chest:[-.1,-.66,-.12],rightArm:[-1.75,-.8,-.6],rightForearm:[-.2,0,0],rightHand:[-.45,0,-.35],leftArm:[-.6,0,-.2]},{sign:-1});
 const held={...mix(f2,pose({}),.08),body:f2.body,offset:f2.offset},settle=mix(pose({}),f2,.3);
 return{id:'twin',name:'雙燕迴翔',duration,impact:second,damage:24,posture:20,range:2.75,arc:1.25,lungeSpeed:2.2,lungeUntil:.2,travelStart:.08,travelEnd:second+.055,trailStart:.12,trailEnd:second+.15,
  hits:[{at:first,damage:11,posture:9,gain:6},{at:second,damage:13,posture:11,gain:6}],
  frames:[[0,pose({})],[first-.12,w1],[first-.055,w1],[first,c1],[first+.07,f1],[second-.09,w2],[second-.05,w2],[second,c2],[second+.075,f2],[second+.2,held],[duration-.07,settle],[duration,pose({})]]};
}
// 躍淵斬. Off the run: one step down, a tucked flight with the blade over the shoulder,
// and both hands drive it into the ground. The hit is the landing, all around the hero.
function leap(){
 const crouch=pose({hips:[.1,-.12,0],chest:[.34,-.22,0],head:[-.22,.12,0],rightArm:[-.15,-.5,-.35],rightForearm:[-.75,0,0],leftArm:[.3,0,-.3],leftForearm:[-.4,0,0],rightLeg:[-.6,0,-.06],rightKnee:[1,0,0],leftLeg:[-.15,0,.06],leftKnee:[.8,0,0],body:[.14,0,0],offset:[0,-.26,0]});
 const rise=pose({hips:[-.1,-.2,0],chest:[-.22,-.34,-.04],head:[.06,.2,0],rightArm:[-2.45,-.4,-.3],rightForearm:[-.9,0,0],leftArm:[-1.9,.2,.3],leftForearm:[-.8,0,0],rightLeg:[-1.1,0,-.08],rightKnee:[1.3,0,0],leftLeg:[.4,0,.08],leftKnee:[.95,0,0],body:[-.12,0,0],offset:[0,.6,0]});
 const peak=pose({hips:[-.06,-.14,0],chest:[-.3,-.26,-.04],head:[.12,.14,0],rightArm:[-2.9,.1,.1],rightForearm:[-1.1,0,0],leftArm:[-2.5,.2,.3],leftForearm:[-1,0,0],rightLeg:[-.85,0,-.08],rightKnee:[1.35,0,0],leftLeg:[-.3,0,.08],leftKnee:[1.25,0,0],body:[.06,0,0],offset:[0,.8,0]});
 const land=pose({hips:[.22,.12,0],chest:[.62,.22,.06],head:[-.26,-.14,0],rightArm:[-.38,.25,.15],rightForearm:[-.06,0,0],rightHand:[-.28,0,0],leftArm:[-.3,-.2,-.25],leftForearm:[-.3,0,0],rightLeg:[-.95,0,-.1],rightKnee:[1.05,0,0],leftLeg:[.45,0,.1],leftKnee:[.55,0,0],body:[.14,0,0],offset:[0,-.32,.12]});
 const held={...mix(land,pose({}),.08),body:land.body,offset:land.offset},settle=mix(pose({}),land,.3);
 return{id:'leap',name:'躍淵斬',duration:.96,impact:.5,cost:24,heavy:true,advance:true,damage:30,posture:30,range:3,arc:Math.PI,shock:3,lungeSpeed:8,lungeUntil:.5,travelStart:.1,travelEnd:.5,travelPower:1.35,trailStart:.3,trailEnd:.64,
  frames:[[0,pose({})],[.1,crouch],[.25,rise],[.39,peak],[.5,land],[.56,land],[.7,held],[.88,settle],[.96,pose({})]]};
}
// 敕令 · 鎮. The blade goes up point-down in both hands, then is planted on one knee;
// the ring breaks from where it enters the ground.
function seal(){
 const lift=pose({hips:[-.06,0,0],chest:[-.22,0,0],head:[.12,0,0],rightArm:[-2.5,.32,.28],rightForearm:[-1.05,0,0],rightHand:[.85,0,0],leftArm:[-2.3,-.3,-.32],leftForearm:[-1.15,0,0],rightLeg:[-.1,0,-.06],rightKnee:[.2,0,0],leftLeg:[.1,0,.06],leftKnee:[.2,0,0],offset:[0,-.03,0]});
 const plant=pose({hips:[.24,0,0],chest:[.5,0,0],head:[-.3,0,0],rightArm:[-.8,.3,.22],rightForearm:[-.5,0,0],rightHand:[1.2,0,0],leftArm:[-.55,-.45,-.42],leftForearm:[-1.15,0,0],rightLeg:[-1.1,0,-.08],rightKnee:[1.35,0,0],leftLeg:[.35,0,.08],leftKnee:[1.4,0,0],body:[.1,0,0],offset:[0,-.5,.05]});
 const settle=mix(pose({}),plant,.35);
 return{id:'seal',name:'敕令 · 鎮',duration:1.15,impact:.55,art:true,qiCost:40,gain:0,heavy:true,ward:.62,damage:22,posture:60,range:4.5,arc:Math.PI,shock:4.5,lungeSpeed:0,lungeUntil:0,trailStart:.4,trailEnd:.6,
  frames:[[0,pose({})],[.2,lift],[.42,lift],[.55,plant],[.86,plant],[1.05,settle],[1.15,pose({})]]};
}
export const PLAYER_MOVES={
 dashCut:move('dashCut','疾風拔斬',.72,.23,
  {hips:[.08,-.32,0],chest:[.22,-.6,-.08],rightArm:[-.5,-.9,-.5],rightForearm:[-.9,0,0],rightHand:[-.3,0,-.3],leftArm:[.35,0,-.6],rightLeg:[-.5,0,0],leftLeg:[.32,0,0]},
  {hips:[.08,.2,0],chest:[.12,.35,.08],rightArm:[-1.2,.35,.35],rightForearm:[-.08,0,0],rightHand:[-.4,0,.2],leftArm:[-.65,0,-.6]},
  {hips:[0,.42,0],chest:[-.08,.75,.12],rightArm:[-1.85,.8,.8],rightForearm:[-.25,0,0],rightHand:[-.25,0,.3],leftArm:[.1,0,-.4]},
  {advance:true,damage:32,posture:30,range:3.25,arc:1.55,lungeSpeed:7,lungeUntil:.2,trailStart:.11,trailEnd:.42}),
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
 twin:twin(),
 // 崩山斷. The chain's last cut comes straight down in both hands; where it lands the ground
 // jumps, and that shock is a second, lighter hit on everything standing close.
 crash:move('crash','崩山斷',.94,.36,
  {hips:[-.1,-.08,0],chest:[-.3,-.12,0],rightArm:[-2.7,.42,.36],rightForearm:[-.95,0,0],leftArm:[-2.45,-.32,-.36],leftForearm:[-.95,0,0],rightLeg:[-.2,0,0],rightKnee:[.3,0,0],leftLeg:[.2,0,0]},
  {hips:[.18,.06,0],chest:[.5,.1,.04],rightArm:[-.8,.16,.1],rightForearm:[-.08,0,0],rightHand:[-.22,0,0],leftArm:[-.65,-.2,-.2],leftForearm:[-.2,0,0],rightLeg:[-.3,0,0],rightKnee:[.35,0,0],leftLeg:[.3,0,0],offset:[0,-.14,0]},
  {hips:[.22,.08,0],chest:[.68,.14,.05],rightArm:[.12,.2,.12],rightForearm:[-.05,0,0],leftArm:[.15,-.1,-.3],rightLeg:[-.3,0,0],rightKnee:[.5,0,0],leftLeg:[.3,0,0],offset:[0,-.26,0]},
  {weighty:true,heavy:true,damage:38,posture:36,range:3.1,arc:1.05,lungeSpeed:2.6,lungeUntil:.2,trailStart:.26,trailEnd:.54,
   hits:[{at:.36,damage:28,posture:24},{at:.44,damage:10,posture:12,range:2.6,arc:Math.PI,shock:2.6,heavy:false,gain:0}]}),
 leap:leap(),
 // 飛墨斬. A level cut from the guard that lets the ink go: the damage belongs to the crescent it throws.
 inkWave:move('inkWave','飛墨斬',.62,.26,
  {hips:[.05,.3,0],chest:[.1,.7,.08],rightArm:[-.5,1.2,.75],rightForearm:[-.75,0,0],rightHand:[-.2,0,.2],leftArm:[-.3,0,-.3],leftLeg:[-.12,0,0]},
  {hips:[0,-.08,0],chest:[.06,-.1,-.05],rightArm:[-1.3,.05,-.05],rightForearm:[-.1,0,0],rightHand:[-.5,0,-.3],leftArm:[-.6,0,-.4]},
  {hips:[0,-.26,0],chest:[.08,-.7,-.1],rightArm:[-1.3,-.95,-.6],rightForearm:[-.12,0,0],rightHand:[-.1,0,-.3],leftArm:[-.9,0,-.5]},
  {backhand:true,art:true,qiCost:20,gain:0,heavy:false,damage:26,posture:22,lungeSpeed:.8,lungeUntil:.12,trailStart:.16,trailEnd:.42,projectile:{speed:19,range:14,radius:.85,pierce:3}}),
 seal:seal(),
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
 // The ultimate: gather ink while the world holds still (`charge`), whirl through a flurry, then one closing cut.
 spin:ultimate()
};
// Follow-up and execution share familiar blade arcs with their own commitment timings.
for(const [id,name,source,duration,impact,extra] of [
 ['riposte','乘隙反斬','reverse',.68,.23,{damage:52,posture:54,range:3.45,lungeSpeed:7,lungeUntil:.22}],
 ['execute','鎮魂處決','heavy',.94,.4,{damage:110,posture:0,range:3.4,lungeSpeed:3,lungeUntil:.2}]
]){
 const src=PLAYER_MOVES[source];PLAYER_MOVES[id]={...src,...extra,id,name,duration,impact,trailStart:impact-.11,trailEnd:impact+.13,frames:src.frames.map(([t,p])=>[t<=src.impact?t*impact/src.impact:impact+(t-src.impact)*(duration-impact)/(src.duration-src.impact),structuredClone(p)])};
}
// Keep the rotation at 2π in recovery; interpolating to zero would reverse the spin.
for(const id of ['sweep'])for(const index of [-1,-2,-3]){const frame=PLAYER_MOVES[id].frames.at(index)[1];frame.body=[frame.body[0],Math.PI*2,frame.body[2]];}
// Short taps walk this chain; the last two are the new closing cuts.
export const LIGHT_CHAIN=Object.freeze(['diagonal','reverse','cleave','twin','crash']);
export function playerMove(actor){return PLAYER_MOVES[actor.move]||PLAYER_MOVES[actor.state==='heavy'?'heavy':actor.state==='special'?'spin':LIGHT_CHAIN[((actor.chain||1)-1)%LIGHT_CHAIN.length]];}
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
// A move that covers ground over a longer stretch (two cuts, a leap) names its own window.
export function attackTravel(move,age){
 const start=move.travelStart??Math.max(0,move.impact-.13),end=move.travelEnd??move.impact+.055,u=Math.max(0,Math.min(1,(age-start)/(end-start)));
 return move.lungeSpeed*move.lungeUntil*(1-Math.pow(1-u,move.travelPower??3));
}
