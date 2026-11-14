const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const TAU=Math.PI*2;

// Cadence and step geometry shared by the pose and the foot planner. Stride
// grows with speed; ground contact shortens until a run has a real flight phase.
export function gaitTiming(speed,height=1.95){
 const scale=height/1.95,cycle=scale*(.5+.46*speed),travel=Math.min(cycle*.58,scale*(.42+.036*speed));
 return{cycle,rate:TAU/cycle,stance:clamp(travel/cycle,.24,.62),reach:travel*.5,run:clamp((speed/scale-1.8)/1.6,0,1)};
}

// Directional gait: cross-stepping/retreating should not look like running forward.
// Phase 0 is right-foot contact; shoulders counter the pelvis and the off hand
// swings against the lead leg while the sword arm stays low and quiet.
export function locomotionPose(speed,phase,time,localX=0,localZ=1,turn=0){
 const go=clamp(speed/1.2,0,1),stride=clamp(speed/3,0,1),run=clamp((speed-1.8)/1.6,0,1),sprint=clamp((speed-3.6)/2.2,0,1);
 const c=Math.cos(phase),wave=Math.sin(phase),breath=Math.sin(time*2.1)*.014,idle=1-go,shift=Math.sin(time*.7)*.02*idle;
 const stance=gaitTiming(speed).stance,swing=(.3+run*.3)*go;
 const pose={
  hips:[.02+run*.035,c*.11*go+shift,-c*.035*go],
  spine:[breath+run*.03,-c*.085*go,0],
  chest:[.03+run*.07+sprint*.13+breath*.6,-c*.11*go-shift,-localX*.045*go],
  head:[-.04-run*.07-sprint*.09,c*.08*go,0],
  rightArm:[-.22*idle+go*(.16+c*swing*.4),-.3-go*.12,.12+go*.03],
  rightForearm:[-.42*idle-go*(.34+run*.2+Math.max(0,-c)*.12),0,0],
  rightHand:[-.1*idle,0,0],
  leftArm:[-.1-c*swing-run*.06,0,-.1-run*.05],
  leftForearm:[-.22-go*(.2+run*.75)-Math.max(0,c)*.28*go,0,0],
  body:[(run*.06+sprint*.085)*localZ,0,-localX*.08*go-turn*.045],
  offset:[-Math.cos(phase-Math.PI*stance)*.016*go*(1-run*.5),-.012*go-Math.cos(phase*2-TAU*stance)*(.01+run*.024)*go+breath*.3*idle,0]
 };
 // Forward-kinematic legs are a fallback; grounded feet are solved in footwork3d.
 for(const [side,sign]of[['right',1],['left',-1]]){
  const cycle=wave*sign,reach=(.36+sprint*.16)*stride;
  pose[side+'Leg']=[-.08+cycle*reach*localZ,0,sign*-.025-cycle*localX*reach*.55];
  pose[side+'Knee']=[.12+Math.max(0,-cycle)*(.55+sprint*.2)*stride,0,0];
  pose[side+'Foot']=[-.06+Math.max(0,cycle)*.17*stride,0,0];
 }
 return pose;
}
