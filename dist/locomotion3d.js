const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Directional gait: cross-stepping/retreating should not look like running forward.
export function locomotionPose(speed,phase,time,localX=0,localZ=1,turn=0){
 const stride=clamp(speed/3,0,1),sprint=clamp((speed-3.3)/2.5,0,1),wave=Math.sin(phase),breath=Math.sin(time*2.1)*.012;
 const pose={hips:[.03+stride*.035,Math.sin(phase)*.065*stride,-wave*.025*stride],spine:[breath,-wave*.065*stride,0],chest:[.025+sprint*.14,-wave*.045*stride,-localX*.045*stride],head:[-.04-sprint*.1,wave*.06*stride,0],rightArm:[-.42-sprint*.28,0,.12],rightForearm:[-.62-sprint*.3,0,0],leftArm:[-.28+wave*.26*stride,0,-.12],leftForearm:[-.38-sprint*.5,0,0],body:[sprint*.085*localZ,0,-localX*.08*stride-turn*.045],offset:[0,-.025+Math.abs(Math.sin(phase*2))*.018*stride,0]};
 for(const [side,sign]of[['right',1],['left',-1]]){
  const cycle=wave*sign,reach=(.36+sprint*.16)*stride;
  pose[side+'Leg']=[-.08+cycle*reach*localZ,0,sign*-.025-cycle*localX*reach*.55];
  pose[side+'Knee']=[.12+Math.max(0,-cycle)*(.55+sprint*.2)*stride,0,0];
  pose[side+'Foot']=[-.06+Math.max(0,cycle)*.17*stride,0,0];
 }
 return pose;
}
