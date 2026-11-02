import {TAU} from './orbits.js';
// Wrap only after computing the individual layer's complete phase.
export function rotationAtDays(days,periodHours,rate=1){
 const turns=days*24/Math.abs(periodHours)*rate;
 return (turns-Math.floor(turns))*TAU;
}
export function planetRotationAt(p,days){
 // Obliquities over 90 degrees encode retrograde axes (Venus/Uranus).
 // Applying the period's minus sign too would reverse them a second time.
 return rotationAtDays(days,p.rotation);
}
export function earthCloudRotationAt(p,days){return rotationAtDays(days,p.rotation,1.035)}
export function simulationDelta(elapsed,rate,paused){return paused?0:elapsed*rate}
