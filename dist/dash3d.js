// Short forward burst: release distance is integrated, independent of frame rate.
import { dodgePose } from './dodge3d.js';
export const DASH=Object.freeze({duration:.38,distance:3.8,cost:20,cooldown:.65,invulnerable:.12,linkAt:.16});
export function dashTravel(age){const u=Math.max(0,Math.min(1,(age-.015)/.32));return DASH.distance*(1-(1-u)**3);}
export function dashPose(a){const p=dodgePose({...a,dodgeYaw:a.dashYaw,rollX:Math.sin(a.dashYaw),rollZ:Math.cos(a.dashYaw)});p.chest=[.3,-.32,0];p.rightArm=[.2,-.6,-.35];p.rightForearm=[-.7,0,0];p.leftArm=[-1,0,-.35];p.body=[.16,0,0];return p;}
