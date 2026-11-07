import {kmToUnits} from './scale.js';
export function createCalendar(data){
 const bodies=new Map(data.bodies.map(b=>[b.name,b]));
 if(bodies.size!==35||[...bodies.values()].some(b=>b.samples.length!==366))throw Error('Incomplete JPL calendar');
 const sample=(name,day)=>{const b=bodies.get(name),i=Math.round(day);if(!b||i<0||i>365)throw Error('No verified sample');return b.samples[i]};
 function relative(name,day,center='Sun',offset=1){const a=sample(name,day),b=sample(center,day);return [0,1,2].map(i=>a[i+offset]-b[i+offset]);}
 return {position(name,day){const [x,y,z]=relative(name,day);return [kmToUnits(x),kmToUnits(z),-kmToUnits(y)]},distance(name,day,center='Sun'){return Math.hypot(...relative(name,day,center))},speed(name,day){return Math.hypot(...relative(name,day,'Sun',4))},source(name,day){const url=new URL(bodies.get(name).query);['START_TIME','STOP_TIME','STEP_SIZE'].forEach(k=>url.searchParams.delete(k));url.searchParams.set('TLIST',String(2451545+Math.round(day)));return url.href}};
}
