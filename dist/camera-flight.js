// Camera path starts at the current pose and ends beside the target's live position.
export function sampleFlight(from,lookFrom,direction,distance,target,progress){
 const t=Math.max(0,Math.min(1,progress));const ease=t*t*t*(t*(t*6-15)+10);
 return {position:from.map((v,i)=>v+(target[i]+direction[i]*distance-v)*ease),look:lookFrom.map((v,i)=>v+(target[i]-v)*ease)};
}
