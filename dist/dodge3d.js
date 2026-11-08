// Shared timing for grounded evasions. Keep the legacy `roll` state for inputs.
export const DODGE={duration:.5,distance:3.2,invulnerable:.30};
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function dodgeTravel(age){const u=clamp((age-.025)/.36);return DODGE.distance*(1-Math.pow(1-u,3));}
export function dodgePose(a){
 const t=Math.max(0,a.total-a.timer),power=smooth(t/.075)*(1-smooth((t-.23)/.27));
 const yaw=a.dodgeYaw??a.yaw,side=a.rollX*Math.cos(yaw)-a.rollZ*Math.sin(yaw),forward=a.rollX*Math.sin(yaw)+a.rollZ*Math.cos(yaw);
 const lead=side>=0?'right':'left',trail=side>=0?'left':'right';
 const p={hips:[.08*power,-side*.16*power,0],chest:[(.19+forward*.12)*power,-side*.2*power,0],head:[-.12*power,side*.2*power,0],rightArm:[-.38-.35*power,side*.15*power,.12+.16*power],rightForearm:[-.3-.4*power,0,0],rightHand:[0,0,-.15*power],leftArm:[-.12-.55*power,0,-.06-.28*power],leftForearm:[-.1-.5*power,0,0],rightLeg:[-.3*power,0,0],leftLeg:[-.3*power,0,0],rightKnee:[.52*power,0,0],leftKnee:[.52*power,0,0],body:[forward*.10*power,0,-side*.21*power],offset:[0,-.055*power,0]};
 p[lead+'Leg'][2]=-side*.23*power;p[trail+'Leg'][2]=side*.16*power;
 p[lead+'Leg'][0]-=Math.abs(forward)*.18*power;p[trail+'Leg'][0]+=Math.abs(forward)*.2*power;
 return p;
}
