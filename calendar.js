import {kmToUnits} from './scale.js';
export function createCalendar(data){
 const bodies=new Map(data.bodies.map(b=>[b.name,b]));
 if(bodies.size!==35||[...bodies.values()].some(b=>b.samples.length!==366))throw Error('Incomplete JPL calendar');
 const sample=(name,day)=>{const b=bodies.get(name),i=Math.round(day);if(!b||i<0||i>365)throw Error('No verified sample');return b.samples[i]};
 function relative(name,day,center='Sun',offset=1){const a=sample(name,day),b=sample(center,day);return [0,1,2].map(i=>a[i+offset]-b[i+offset]);}
 return {position(name,day){const [x,y,z]=relative(name,day);return [kmToUnits(x),kmToUnits(z),-kmToUnits(y)]},distance(name,day,center='Sun'){return Math.hypot(...relative(name,day,center))},speed(name,day){return Math.hypot(...relative(name,day,'Sun',4))},source(name,day){const url=new URL(bodies.get(name).query);['START_TIME','STOP_TIME','STEP_SIZE'].forEach(k=>url.searchParams.delete(k));url.searchParams.set('TLIST',String(2451545+Math.round(day)));return url.href}};
}

// Preserve the dated direction and radial variation while applying display-orbit sizes.
export function calendarDisplayPosition(calendar,name,day,bodies,realistic){
 const position=calendar.position(name,day);
 if(realistic||name==='Sun')return position;
 const body=bodies.get(name);
 if(body.parent){
  const parentActual=calendar.position(body.parent,day);
  const parentDisplay=calendarDisplayPosition(calendar,body.parent,day,bodies,false);
  const factor=body.orbit/kmToUnits(body.distance);
  return position.map((v,i)=>parentDisplay[i]+(v-parentActual[i])*factor);
 }
 const meanKm=body.semimajorAxisAU?body.semimajorAxisAU*149597870.7:body.distance*1e6;
 return position.map(v=>v*body.orbit/kmToUnits(meanKm));
}
